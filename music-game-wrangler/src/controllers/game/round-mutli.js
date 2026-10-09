// music-game-wrangler/src/controllers/game/round-mutli.js
import { error, json } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { parseIdList } from '../../utilities/parseIdList.js';
import { tryBuild } from './rounds-methods/buildingRounds.js';
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

const MULTI_ORDER = [
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'name-position',
];

const QUESTIONS_PER_ROUND_CAP = 5;

// Matches the clamp in rounds.js. Raised from 20 to 500 so multiplayer
// requests can ask for large batches.
const MAX_COUNT = 500;

/**
 * How many featured rounds to reserve in the initial pass.
 *
 * - If `name-featured` is the only requested audio type, we want
 *   every round to be featured — return `count`.
 * - Otherwise, reserve up to 40% of the total, with no hard cap.
 */
function featuredQuota(count, activeAudioOrder) {
  const onlyFeatured =
    activeAudioOrder.length === 1 && activeAudioOrder[0] === 'name-featured';
  if (onlyFeatured) return count;
  return Math.max(1, Math.floor(count * 0.4));
}

export async function getRoundMulti(request, env) {
  const url = new URL(request.url);

  const requestedTypes = parseRequestedTypes(url);
  const activeAudioOrder = requestedTypes.length > 0
    ? MULTI_ORDER.filter(t => requestedTypes.includes(t))
    : MULTI_ORDER;

  const wantsAudio = requestedTypes.length === 0
    ? true
    : requestedTypes.some(t => AUDIO_TYPES.has(t));
  const wantsLyrics = requestedTypes.length === 0
    ? true
    : requestedTypes.some(t => LYRICS_TYPES.has(t));

  if (!wantsAudio && !wantsLyrics) {
    return error(
      `types must include at least one of: ${VALID_TYPES.join(', ')}`,
      400
    );
  }

  const count     = clamp(Number(url.searchParams.get('count') ?? 5), 1, MAX_COUNT);
  const artistIds = parseIdList(url.searchParams.get('artists'));
  const genreIds  = parseIdList(url.searchParams.get('genres'));
  const years     = parseIdList(url.searchParams.get('years'));
  const rendition = url.searchParams.get('rendition') === 'reverse' ? 'reverse' : 'forward';

  const { ids: scopeArtistIds, tier: scopeTier } = await resolveScope(env, {
    artistIds, genreIds, years,
  });

  if (scopeArtistIds.length === 0) {
    return error('No clips match the selected scope', 404);
  }

  let usedRendition = rendition;
  let audioSlots = [];
  if (wantsAudio) {
    audioSlots = await pickSlotsVaried(env, scopeArtistIds, count * 5, years, rendition);
    if (rendition === 'reverse' && audioSlots.length === 0) {
      usedRendition = 'forward';
      audioSlots = await pickSlotsVaried(env, scopeArtistIds, count * 5, years, 'forward');
    }
  }
  const lyricsRowsAll = wantsLyrics
    ? await resolveLyricsPool(env, { scopeArtistIds, genreIds, years })
    : [];
  const lyricsRows = wantsLyrics ? pickLyricsVaried(lyricsRowsAll, count * 5) : [];

  if (audioSlots.length === 0 && lyricsRows.length === 0) {
    return error('No playable clips in the selected scope', 404);
  }

  const origin = new URL(request.url).origin;

  const degenerate = computeDegenerateTypes(audioSlots, lyricsRows, scopeArtistIds);
  const fired = new Set();
  const degenerateState = { degenerate, fired };

  const rounds = [];
  const usedAudioSlotIds = new Set();
  const usedLyricIds = new Set();
  const typeTally = emptyTally();

  // ── Featured reservation (audio only) ──
  // Fetch a dedicated pool of featured slots instead of filtering the
  // already-sampled audioSlots array. The sampled pool is biased by
  // the random pick from pickSlotsVaried, which rarely includes enough
  // featured tracks when only ~5% of the catalogue carries featured
  // data. A direct query guarantees coverage.
  const wantsFeatured = activeAudioOrder.includes('name-featured');
  let featuredPool = [];
  if (wantsFeatured) {
    featuredPool = await fetchFeaturedSlots(
      env, scopeArtistIds, count * 3, years, usedRendition
    );
  }
  

  // ── Pass A: featured reservation ──
  if (wantsFeatured && featuredPool.length > 0) {
    const featuredLimit = Math.min(
      featuredQuota(count, activeAudioOrder),
      featuredPool.length
    );
    for (const slot of featuredPool) {
      if (rounds.length >= featuredLimit) break;
      if (usedAudioSlotIds.has(slot.id)) continue;
      const round = await buildRoundMulti(
        env, request, slot, scopeArtistIds, origin, activeAudioOrder, degenerateState
      );
      if (round) {
        rounds.push(round);
        usedAudioSlotIds.add(slot.id);
        for (const q of round.questions) {
          typeTally[q.type] = (typeTally[q.type] ?? 0) + 1;
          if (degenerate.has(q.type)) fired.add(q.type);
        }
      }
    }
  }

  // ── Pass B: mixed fill ──
  const maxIter = Math.max(audioSlots.length, lyricsRows.length);
  let ai = 0, li = 0;

  for (let i = 0; i < maxIter * 2 && rounds.length < count; i++) {
    if (i % 2 === 0 && ai < audioSlots.length) {
      const slot = audioSlots[ai++];
      if (usedAudioSlotIds.has(slot.id)) continue;
      const round = await buildRoundMulti(
        env, request, slot, scopeArtistIds, origin, activeAudioOrder, degenerateState
      );
      if (round) {
        rounds.push(round);
        usedAudioSlotIds.add(slot.id);
        for (const q of round.questions) {
          typeTally[q.type] = (typeTally[q.type] ?? 0) + 1;
          if (degenerate.has(q.type)) fired.add(q.type);
        }
      }
    } else if (li < lyricsRows.length) {
      const row = lyricsRows[li++];
      if (usedLyricIds.has(row.id)) continue;
      const round = await buildLyricsRound(
        env, request, row, requestedTypes, scopeArtistIds, i, typeTally, degenerateState
      );
      if (round) {
        rounds.push({
          slotId: round.slotId,
          lyrics: round.lyrics,
          revealClip: round.revealClip,
          questions: [{ ...round.question, type: round.type }],
        });
        usedLyricIds.add(row.id);
        typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
        if (degenerate.has(round.type)) fired.add(round.type);
      }
    }
  }

  // ── Fallback pass: audio ──
  if (rounds.length < count) {
    for (const slot of audioSlots) {
      if (rounds.length >= count) break;
      if (usedAudioSlotIds.has(slot.id)) continue;
      const round = await buildRoundMulti(
        env, request, slot, scopeArtistIds, origin, activeAudioOrder, degenerateState
      );
      if (round) {
        rounds.push(round);
        usedAudioSlotIds.add(slot.id);
        for (const q of round.questions) {
          typeTally[q.type] = (typeTally[q.type] ?? 0) + 1;
          if (degenerate.has(q.type)) fired.add(q.type);
        }
      }
    }
  }

  // ── Fallback pass: lyrics ──
  if (rounds.length < count) {
    for (const row of lyricsRows) {
      if (rounds.length >= count) break;
      if (usedLyricIds.has(row.id)) continue;
      const round = await buildLyricsRound(
        env, request, row, requestedTypes, scopeArtistIds, li, typeTally, degenerateState
      );
      if (round) {
        rounds.push({
          slotId: round.slotId,
          lyrics: round.lyrics,
          revealClip: round.revealClip,
          questions: [{ ...round.question, type: round.type }],
        });
        usedLyricIds.add(row.id);
        typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
        if (degenerate.has(round.type)) fired.add(round.type);
      }
    }
  }

  if (rounds.length === 0) {
    return error('Could not construct any rounds from the selected scope', 500);
  }

  shuffleInPlace(rounds);

  const featuredRounds = rounds.filter(r =>
    r.questions?.some(q => q.type === 'name-featured')
  ).length;

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
      featuredRounds,
      typeTally,
      degenerateTypes: [...degenerate],
      lyricsPoolSize: lyricsRows.length,
      generatedAt: new Date().toISOString(),
      requestedRendition: rendition, 
      usedRendition
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   buildRoundMulti — one clip, up to 5 audio questions.
   ═══════════════════════════════════════════════════════════ */

async function buildRoundMulti(
  env, request, slot, scopeArtistIds, origin, activeAudioOrder, degenerateState
) {
  const canAskArtist   = scopeArtistIds.length >= 2;
  const canAskAlbum    = !!slot.album_name;
  const canAskFeatured = !!slot.featured_artists;

  const degenerate = degenerateState?.degenerate ?? new Set();
  const fired      = degenerateState?.fired      ?? new Set();

  const questions = [];
  for (const type of activeAudioOrder) {
    if (questions.length >= QUESTIONS_PER_ROUND_CAP) break;
    if (degenerate.has(type) && fired.has(type)) continue;
    if (type === 'name-artist'   && !canAskArtist)   continue;
    if (type === 'name-album'    && !canAskAlbum)    continue;
    if (type === 'name-featured' && !canAskFeatured) continue;

    const built = await tryBuild(env, request, slot, type, scopeArtistIds);
    if (built && built.question) {
      questions.push({
        type: built.type,
        prompt: built.question.prompt,
        options: built.question.options,
        correctValue: built.question.correctValue,
      });
    }
  }

  if (questions.length === 0) return null;

  return {
    slotId: slot.id,
    clip: {
      r2_key: slot.r2_key,
      serveUrl: `${origin}/clips/serve?key=${encodeURIComponent(slot.r2_key)}`,
      position: null,
    },
    questions,
  };
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

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}