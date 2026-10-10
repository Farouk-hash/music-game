// music-game-wrangler/src/controllers/game/rounds.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { parseIdList } from '../../utilities/parseIdList.js';
import { buildRound } from './rounds-methods/buildingRounds.js';
import { buildLyricsRound } from './rounds-methods/buildingLyrics.js';
import { pickSlotsVaried } from './rounds-methods/slots.js';
import { computeDegenerateTypes } from './rounds-methods/degenerate-types.js';
import {
  VALID_TYPES,
  AUDIO_TYPES,
  LYRICS_TYPES,
  emptyTally,
  resolveScope,
  resolveLyricsPool,
  pickLyricsVaried,
  parseRequestedTypes,
} from './rounds-methods/scope-helpers.js';
import { chunkedIn, D1_CHUNK_SIZE } from '../../utilities/chunkedIn.js';


import { fetchInstrumentSlots } from './rounds-methods/instruments-slots.js';
import { buildInstrumentalRound } from './rounds-methods/buildingInstrumental.js';
import { fetchLyricsPool } from './rounds-methods/instruments-lyrics-pool.js';


export { VALID_TYPES };

const MAX_COUNT = 500;

/**
 * How many featured rounds to reserve in the initial pass.
 * Matches the logic in round-mutli.js so level 1 and level 2 behave
 * the same when the player requests featured-only questions.
 */
function featuredQuota(count, requestedTypes) {
  const onlyFeatured =
    requestedTypes.length === 1 && requestedTypes[0] === 'name-featured';
  if (onlyFeatured) return count;
  return Math.max(1, Math.floor(count * 0.4));
}


/**
 * Direct DB query for featured slots — bypasses the sampling bias of
 * pickSlotsVaried, which returns a random subset of the artist's tracks
 * that rarely contains enough featured ones (~5% of catalogue).
 *
 * - Chunks `artistIds` into batches of 90 to stay under D1's 100-bound-
 *   parameter hard cap (query also binds `years` + `limit`).
 * - When `rendition === 'reverse'`, only slots with `r2_reversed_key`
 *   are eligible, and the selected column is aliased to `r2_key` so
 *   downstream code is unchanged.
 *
 * NOTE: Unlike `pickSlotsVaried`, this function does NOT do scope-level
 * fallback. Callers must decide whether to invoke it with 'reverse' or
 * 'forward' based on `usedRendition`.
 */

async function fetchFeaturedSlots(env, artistIds, limit, years = [], rendition = 'forward') {
  if (!artistIds.length) return [];

  const isReverse = rendition === 'reverse';
  const keyColumn = isReverse ? 'r2_reversed_key' : 'r2_key';
  const rows = [];

  await chunkedIn(artistIds, D1_CHUNK_SIZE, async (chunk) => {
    const idPh = chunk.map(() => '?').join(',');

    if (years.length > 0) {
      const yearPh = years.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `SELECT t.id, t.name, t.artist_id, t.${keyColumn} AS r2_key, t.position,
                t.album_name, t.featured_artists
         FROM tracks t
         JOIN album_years ay
           ON ay.artist_id = t.artist_id
          AND ay.album_name = t.album_name
         WHERE t.artist_id IN (${idPh})
           AND t.${keyColumn} IS NOT NULL
           AND t.featured_artists IS NOT NULL
           AND t.featured_artists != ''
           AND ay.released_year IN (${yearPh})
         ORDER BY RANDOM()
         LIMIT ?`
      ).bind(...chunk, ...years, limit).all();
      for (const r of results ?? []) rows.push(r);
    } else {
      const { results } = await env.DB.prepare(
        `SELECT id, name, artist_id, ${keyColumn} AS r2_key, position,
                album_name, featured_artists
         FROM tracks
         WHERE artist_id IN (${idPh})
           AND ${keyColumn} IS NOT NULL
           AND featured_artists IS NOT NULL
           AND featured_artists != ''
         ORDER BY RANDOM()
         LIMIT ?`
      ).bind(...chunk, limit).all();
      for (const r of results ?? []) rows.push(r);
    }
    return [];
  });

  return rows.slice(0, limit);
}

export async function getRound(request, env) {
  const url = new URL(request.url);
  const requestedTypes = parseRequestedTypes(url);

  const count     = clamp(Number(url.searchParams.get('count') ?? 5), 1, MAX_COUNT);
  const artistIds = parseIdList(url.searchParams.get('artists'));
  const genreIds  = parseIdList(url.searchParams.get('genres'));
  const years     = parseIdList(url.searchParams.get('years'));
  const rendition = url.searchParams.get('rendition') === 'reverse' ? 'reverse' : 'forward';

  const instrumentsParam = url.searchParams.get('instruments');
  const instrumentsMode =
    instrumentsParam === 'all'   ? 'all'   :
    instrumentsParam === 'mixed' ? 'mixed' :
                                   'none';

  const { ids: scopeArtistIds, tier: scopeTier } = await resolveScope(env, {
    artistIds, genreIds, years,
  });

  if (scopeArtistIds.length === 0) {
    return error('No clips match the selected scope', 404);
  }

  // Split count by mode
  let traditionalCount = count;
  let instrumentalCount = 0;
  if (instrumentsMode === 'all') {
    traditionalCount = 0;
    instrumentalCount = count;
  } else if (instrumentsMode === 'mixed') {
    traditionalCount = Math.round(count / 2);
    instrumentalCount = count - traditionalCount;
  }

  /* ── Traditional pool ─────────────────────────────────── */
  let usedRendition = rendition;
  let audioSlots = [];
  if (traditionalCount > 0) {
    audioSlots = await pickSlotsVaried(
      env, scopeArtistIds, traditionalCount * 5, years, rendition
    );
    if (rendition === 'reverse' && audioSlots.length === 0) {
      usedRendition = 'forward';
      audioSlots = await pickSlotsVaried(
        env, scopeArtistIds, traditionalCount * 5, years, 'forward'
      );
    }
  }
  const lyricsRowsAll = traditionalCount > 0
    ? await resolveLyricsPool(env, { scopeArtistIds, genreIds, years })
    : [];
  const lyricsRows = traditionalCount > 0
    ? pickLyricsVaried(lyricsRowsAll, traditionalCount * 5)
    : [];

  /* ── Instrumental pool ────────────────────────────────── */
  let instrumentSlots = [];
  let lyricsByKey = null;
  if (instrumentalCount > 0) {
    instrumentSlots = await fetchInstrumentSlots(
      env, scopeArtistIds, instrumentalCount * 5, years
    );
    if (instrumentSlots.length > 0) {
      lyricsByKey = await fetchLyricsPool(env, scopeArtistIds);
    }
  }

  if (
    audioSlots.length === 0 &&
    lyricsRows.length === 0 &&
    instrumentSlots.length === 0
  ) {
    return error('No playable clips in the selected scope', 404);
  }

  const degenerate = computeDegenerateTypes(
    audioSlots, lyricsRows, scopeArtistIds, instrumentSlots
  );
  const fired = new Set();
  const degenerateState = { degenerate, fired };

  const rounds = [];
  const usedAudioSlotIds = new Set();        // track slots
  const usedInstrumentSlotIds = new Set();   // instrument slots
  const usedLyricIds = new Set();
  const typeTally = emptyTally();

  /* ── Featured reservation (audio) ─────────────────────── */
  const wantsFeatured = requestedTypes.length === 0
    || requestedTypes.includes('name-featured');

  if (traditionalCount > 0 && wantsFeatured) {
    const featuredPool = await fetchFeaturedSlots(
      env, scopeArtistIds, count * 3, years, usedRendition
    );

    const featuredDegenerate = new Set(degenerate);
    featuredDegenerate.delete('name-featured');
    const featuredState = { degenerate: featuredDegenerate, fired: new Set() };

    const featuredLimit = Math.min(
      featuredQuota(count, requestedTypes),
      featuredPool.length
    );

    for (const slot of featuredPool) {
      if (rounds.length >= featuredLimit) break;
      if (usedAudioSlotIds.has(slot.id)) continue;
      const round = await buildRound(
        env, request, slot, requestedTypes, scopeArtistIds,
        rounds.length, typeTally, featuredState
      );
      if (round) {
        rounds.push(round);
        usedAudioSlotIds.add(slot.id);
        typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
      }
    }
  }

  /* ── Instrumental pass ────────────────────────────────── */
  if (instrumentalCount > 0 && instrumentSlots.length > 0) {
    let builtInstrumental = 0;
    for (let i = 0; i < instrumentSlots.length; i++) {
      if (builtInstrumental >= instrumentalCount) break;
      const slot = instrumentSlots[i];
      if (usedInstrumentSlotIds.has(slot.id)) continue;

      const round = await buildInstrumentalRound(
        env, request, slot, requestedTypes, scopeArtistIds,
        i, typeTally, degenerateState, lyricsByKey
      );
      if (round) {
        rounds.push(round);
        usedInstrumentSlotIds.add(slot.id);
        builtInstrumental += 1;
        typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
        if (degenerate.has(`instr:${round.type}`)) fired.add(`instr:${round.type}`);
      }
    }
  }

  /* ── Phase A: explicit types (traditional) ────────────── */
  if (traditionalCount > 0 && requestedTypes.length > 0) {
    const wantAudio  = requestedTypes.some(t => AUDIO_TYPES.has(t));
    const wantLyrics = requestedTypes.some(t => LYRICS_TYPES.has(t));

    if (wantAudio) {
      for (let i = 0; i < audioSlots.length; i++) {
        if (rounds.length >= count) break;
        const slot = audioSlots[i];
        if (usedAudioSlotIds.has(slot.id)) continue;
        const round = await buildRound(
          env, request, slot, requestedTypes, scopeArtistIds, i, typeTally, degenerateState
        );
        if (round) {
          rounds.push(round);
          usedAudioSlotIds.add(slot.id);
          typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
          if (degenerate.has(round.type)) fired.add(round.type);
        }
      }
    }

    if (wantLyrics) {
      for (let i = 0; i < lyricsRows.length; i++) {
        if (rounds.length >= count) break;
        const row = lyricsRows[i];
        if (usedLyricIds.has(row.id)) continue;
        const round = await buildLyricsRound(
          env, request, row, requestedTypes, scopeArtistIds, i, typeTally, degenerateState
        );
        if (round) {
          rounds.push(round);
          usedLyricIds.add(row.id);
          typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
          if (degenerate.has(round.type)) fired.add(round.type);
        }
      }
    }
  }

  /* ── Phase B: mixed fill (traditional, no types specified) ── */
  if (
    traditionalCount > 0 &&
    requestedTypes.length === 0 &&
    rounds.length < count
  ) {
    const maxIter = Math.max(audioSlots.length, lyricsRows.length);
    let ai = 0, li = 0;
    for (let i = 0; i < maxIter * 2 && rounds.length < count; i++) {
      if (i % 2 === 0 && ai < audioSlots.length) {
        const slot = audioSlots[ai++];
        if (!usedAudioSlotIds.has(slot.id)) {
          const round = await buildRound(
            env, request, slot, [], scopeArtistIds, i, typeTally, degenerateState
          );
          if (round) {
            rounds.push(round);
            usedAudioSlotIds.add(slot.id);
            typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
            if (degenerate.has(round.type)) fired.add(round.type);
          }
        }
      } else if (li < lyricsRows.length) {
        const row = lyricsRows[li++];
        if (!usedLyricIds.has(row.id)) {
          const round = await buildLyricsRound(
            env, request, row, [], scopeArtistIds, i, typeTally, degenerateState
          );
          if (round) {
            rounds.push(round);
            usedLyricIds.add(row.id);
            typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
            if (degenerate.has(round.type)) fired.add(round.type);
          }
        }
      }
    }
  }

  if (rounds.length === 0) {
    return error('Could not construct any rounds from the selected scope', 500);
  }

  const requestedCount = requestedTypes.length > 0
    ? rounds.filter(r => requestedTypes.includes(r.type)).length
    : rounds.length;

  return json({
    rounds,
    meta: {
      scope: {
        artistCount: scopeArtistIds.length,
        genreIds,
        artistIds,
        years,
        tier: scopeTier,
      },
      requestedCount: count,
      generatedCount: rounds.length,
      requestedTypes,
      requestedTypeGenerated: requestedCount,
      typeTally,
      degenerateTypes: [...degenerate],
      lyricsPoolSize: lyricsRows.length,
      requestedRendition: rendition,
      usedRendition,
      requestedInstruments: instrumentsMode,
      instrumentRounds: rounds.filter(r => r.source === 'instrumental').length,
      generatedAt: new Date().toISOString(),
    },
  });
}