// src/controllers/game/rounds.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { parseIdList } from '../../utilities/parseIdList.js';
import { shuffle } from '../../utilities/shuffle.js';
import { buildRound } from './rounds-methods/buildingRounds.js';
import { buildLyricsRound } from './rounds-methods/buildingLyrics.js';
import { pickSlotsVaried, pickFeaturedSlots } from './rounds-methods/slots.js';
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
import { fetchInstrumentSlots } from './rounds-methods/instruments-slots.js';
import { buildInstrumentalRound } from './rounds-methods/buildingInstrumental.js';
import { fetchLyricsPool } from './rounds-methods/instruments-lyrics-pool.js';
import { PoolNotReady, loadArtistData } from '../../lib/cache.js';
import { MAX_ROUNDS_PER_REQUEST, workSetFor } from './rounds-methods/work-set.js';

export { VALID_TYPES };

const MAX_COUNT = MAX_ROUNDS_PER_REQUEST;
const OVERFETCH = 3;       // candidates per needed round (was 5)

function featuredQuota(count, requestedTypes) {
  const onlyFeatured =
    requestedTypes.length === 1 && requestedTypes[0] === 'name-featured';
  if (onlyFeatured) return count;
  return Math.max(1, Math.floor(count * 0.4));
}

export async function getRound(request, env, ctx) {
  try {
    return await handleRound(request, env, ctx);
  } catch (err) {
    if (err instanceof PoolNotReady) {
      console.warn('pool not ready:', err.message);
      return error('Game data cache is not built yet. Rebuild the pool and retry.', 503);
    }
    throw err;
  }
}

async function handleRound(request, env, ctx) {
  const body = await request.json().catch(() => ({}));

  const requestedTypes = parseRequestedTypes(body.types);
  const count     = clamp(Number(body.count ?? 5), 1, MAX_COUNT);
  const artistIds = parseIdList(body.artists);
  const genreIds  = parseIdList(body.genres);
  const years     = parseIdList(body.years);
  const rendition = body.rendition === 'reverse' ? 'reverse' : 'forward';

  const instrumentsMode =
    body.instruments === 'all'   ? 'all'   :
    body.instruments === 'mixed' ? 'mixed' :
                                   'none';

  const { ids: scopeArtistIds, tier: scopeTier } = await resolveScope(env, {
    artistIds, genreIds, years, ctx,
  });
  if (scopeArtistIds.length === 0) {
    return error('No clips match the selected scope', 404);
  }

  let traditionalCount = count;
  let instrumentalCount = 0;
  if (instrumentsMode === 'all') {
    traditionalCount = 0;
    instrumentalCount = count;
  } else if (instrumentsMode === 'mixed') {
    traditionalCount = Math.round(count / 2);
    instrumentalCount = count - traditionalCount;
  }

  /* ── Work set ──────────────────────────────────────────────
     Only a few artists are actually loaded from KV and parsed.
     The full scope is still used for distractor names and degeneracy. */
  const workIds = workSetFor(scopeArtistIds, count);

  const mixedTypes      = requestedTypes.length === 0;
  const wantAudioTypes  = mixedTypes || requestedTypes.some(t => AUDIO_TYPES.has(t));
  const wantLyricsTypes = mixedTypes || requestedTypes.some(t => LYRICS_TYPES.has(t));

  const needCore  = (traditionalCount > 0 && wantAudioTypes) || instrumentalCount > 0;
  const needLyric = traditionalCount > 0 && wantLyricsTypes;

  // One parallel preload; every later helper then hits the in-isolate memo.
  await Promise.all([
    needCore  ? loadArtistData(env, 'core', workIds) : null,
    needLyric ? loadArtistData(env, 'lyr',  workIds) : null,
  ]);

  let usedRendition = rendition;
  let audioSlots = [];
  if (traditionalCount > 0 && wantAudioTypes) {
    audioSlots = await pickSlotsVaried(
      env, workIds, traditionalCount * OVERFETCH, years, rendition
    );
    if (rendition === 'reverse' && audioSlots.length === 0) {
      usedRendition = 'forward';
      audioSlots = await pickSlotsVaried(
        env, workIds, traditionalCount * OVERFETCH, years, 'forward'
      );
    }
  }

  let lyricsRows = [];
  if (needLyric) {
    const all = await resolveLyricsPool(env, { scopeArtistIds: workIds, genreIds, years });
    lyricsRows = pickLyricsVaried(all, traditionalCount * OVERFETCH);
  }

  let instrumentSlots = [];
  let lyricsByKey = null;
  if (instrumentalCount > 0) {
    instrumentSlots = await fetchInstrumentSlots(
      env, workIds, instrumentalCount * OVERFETCH, years
    );
    if (instrumentSlots.length > 0) {
      lyricsByKey = await fetchLyricsPool(env, workIds);
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
  const usedAudioSlotIds = new Set();
  const usedInstrumentSlotIds = new Set();
  const usedLyricIds = new Set();
  const typeTally = emptyTally();

  const bump = (round) => {
    typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
  };

  /* ── 1) featured-artist rounds ─────────────────────────── */
  const wantsFeatured = mixedTypes || requestedTypes.includes('name-featured');

  if (traditionalCount > 0 && wantsFeatured && wantAudioTypes) {
    const featuredPool = await pickFeaturedSlots(
      env, workIds, traditionalCount * 2, years, usedRendition
    );

    const featuredDegenerate = new Set(degenerate);
    featuredDegenerate.delete('name-featured');
    const featuredState = { degenerate: featuredDegenerate, fired: new Set() };

    const featuredLimit = Math.min(
      featuredQuota(traditionalCount, requestedTypes),
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
        bump(round);
      }
    }
  }

  /* ── 2) instrumental rounds ────────────────────────────── */
  if (instrumentalCount > 0 && instrumentSlots.length > 0) {
    let built = 0;
    for (let i = 0; i < instrumentSlots.length && built < instrumentalCount; i++) {
      const slot = instrumentSlots[i];
      if (usedInstrumentSlotIds.has(slot.id)) continue;

      const round = await buildInstrumentalRound(
        env, request, slot, requestedTypes, scopeArtistIds,
        i, typeTally, degenerateState, lyricsByKey
      );
      if (round) {
        rounds.push(round);
        usedInstrumentSlotIds.add(slot.id);
        built += 1;
        bump(round);
        if (degenerate.has(`instr:${round.type}`)) fired.add(`instr:${round.type}`);
      }
    }
  }

  /* ── 3) explicitly requested types ─────────────────────── */
  if (traditionalCount > 0 && requestedTypes.length > 0) {
    if (requestedTypes.some(t => AUDIO_TYPES.has(t))) {
      for (let i = 0; i < audioSlots.length && rounds.length < count; i++) {
        const slot = audioSlots[i];
        if (usedAudioSlotIds.has(slot.id)) continue;
        const round = await buildRound(
          env, request, slot, requestedTypes, scopeArtistIds, i, typeTally, degenerateState
        );
        if (round) {
          rounds.push(round);
          usedAudioSlotIds.add(slot.id);
          bump(round);
          if (degenerate.has(round.type)) fired.add(round.type);
        }
      }
    }

    if (requestedTypes.some(t => LYRICS_TYPES.has(t))) {
      for (let i = 0; i < lyricsRows.length && rounds.length < count; i++) {
        const row = lyricsRows[i];
        if (usedLyricIds.has(row.id)) continue;
        const round = await buildLyricsRound(
          env, request, row, requestedTypes, scopeArtistIds, i, typeTally, degenerateState
        );
        if (round) {
          rounds.push(round);
          usedLyricIds.add(row.id);
          bump(round);
          if (degenerate.has(round.type)) fired.add(round.type);
        }
      }
    }
  }

  /* ── 4) mixed fill: alternate audio / lyrics ───────────── */
  if (traditionalCount > 0 && mixedTypes && rounds.length < count) {
    const maxIter = Math.max(audioSlots.length, lyricsRows.length);
    let ai = 0, li = 0;
    for (let i = 0; i < maxIter * 2 && rounds.length < count; i++) {
      if (i % 2 === 0 && ai < audioSlots.length) {
        const slot = audioSlots[ai++];
        if (usedAudioSlotIds.has(slot.id)) continue;
        const round = await buildRound(
          env, request, slot, [], scopeArtistIds, i, typeTally, degenerateState
        );
        if (round) {
          rounds.push(round);
          usedAudioSlotIds.add(slot.id);
          bump(round);
          if (degenerate.has(round.type)) fired.add(round.type);
        }
      } else if (li < lyricsRows.length) {
        const row = lyricsRows[li++];
        if (usedLyricIds.has(row.id)) continue;
        const round = await buildLyricsRound(
          env, request, row, [], scopeArtistIds, i, typeTally, degenerateState
        );
        if (round) {
          rounds.push(round);
          usedLyricIds.add(row.id);
          bump(round);
          if (degenerate.has(round.type)) fired.add(round.type);
        }
      }
    }
  }

  if (rounds.length === 0) {
    return error('Could not construct any rounds from the selected scope', 500);
  }

  const requestedGenerated = requestedTypes.length > 0
    ? rounds.filter(r => requestedTypes.includes(r.type)).length
    : rounds.length;

  return json({
    rounds,
    meta: {
      scope: {
        artistCount: scopeArtistIds.length,
        workArtistCount: workIds.length,
        genreIds,
        artistIds,
        years,
        tier: scopeTier,
      },
      requestedCount: count,
      generatedCount: rounds.length,
      requestedTypes,
      requestedTypeGenerated: requestedGenerated,
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