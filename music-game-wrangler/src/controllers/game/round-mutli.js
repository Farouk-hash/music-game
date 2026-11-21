// src/controllers/game/round-mutli.js
import { error, json } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { parseIdList } from '../../utilities/parseIdList.js';
import { tryBuild } from './rounds-methods/buildingRounds.js';
import { buildLyricsRound } from './rounds-methods/buildingLyrics.js';
import { pickSlotsVaried, pickFeaturedSlots } from './rounds-methods/slots.js';
import { computeDegenerateTypes } from './rounds-methods/degenerate-types.js';
import { fetchInstrumentSlots } from './rounds-methods/instruments-slots.js';
import { buildInstrumentalRoundMulti } from './rounds-methods/buildingInstrumental.js';
import { fetchLyricsPool } from './rounds-methods/instruments-lyrics-pool.js';
import { MAX_ROUNDS_PER_REQUEST, workSetFor } from './rounds-methods/work-set.js';
import { PoolNotReady, loadArtistData } from '../../lib/cache.js';

import {
  AUDIO_TYPES,
  LYRICS_TYPES,
  emptyTally,
  resolveScope,
  resolveLyricsPool,
  pickLyricsVaried,
  parseRequestedTypes,
} from './rounds-methods/scope-helpers.js';

const MULTI_ORDER = [
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'name-position',
];

const QUESTIONS_PER_ROUND_CAP = 5;
const MAX_COUNT = MAX_ROUNDS_PER_REQUEST;
const OVERFETCH = 3;

function featuredQuota(count, activeAudioOrder) {
  const onlyFeatured =
    activeAudioOrder.length === 1 && activeAudioOrder[0] === 'name-featured';
  if (onlyFeatured) return count;
  return Math.max(1, Math.floor(count * 0.4));
}

export async function getRoundMulti(request, env, ctx) {
  try {
    return await handleRoundMulti(request, env, ctx);
  } catch (err) {
    if (err instanceof PoolNotReady) {
      console.warn('pool not ready:', err.message);
      return error('Game data cache is not built yet. Rebuild the pool and retry.', 503);
    }
    throw err;
  }
}

async function handleRoundMulti(request, env, ctx) {
  const body = await request.json().catch(() => ({}));

  const requestedTypes = parseRequestedTypes(body.types);
  const activeAudioOrder = requestedTypes.length > 0
    ? MULTI_ORDER.filter(t => requestedTypes.includes(t))
    : MULTI_ORDER;

  const wantsAudio = requestedTypes.length === 0
    ? true
    : requestedTypes.some(t => AUDIO_TYPES.has(t));
  const wantsLyrics = requestedTypes.length === 0
    ? true
    : requestedTypes.some(t => LYRICS_TYPES.has(t));

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

  /* ── Work set: only these artists are loaded from KV ──── */
  const workIds = workSetFor(scopeArtistIds, count);

  const needCore  = (traditionalCount > 0 && wantsAudio) || instrumentalCount > 0;
  const needLyric = traditionalCount > 0 && wantsLyrics;

  await Promise.all([
    needCore  ? loadArtistData(env, 'core', workIds) : null,
    needLyric ? loadArtistData(env, 'lyr',  workIds) : null,
  ]);

  /* ── Traditional pool ─────────────────────────────────── */
  let usedRendition = rendition;
  let audioSlots = [];
  if (traditionalCount > 0 && wantsAudio) {
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

  /* ── Instrumental pool ────────────────────────────────── */
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

  const origin = new URL(request.url).origin;

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

  const tallyQuestions = (round, prefix = '') => {
    for (const q of round.questions) {
      typeTally[q.type] = (typeTally[q.type] ?? 0) + 1;
      if (degenerate.has(`${prefix}${q.type}`)) fired.add(`${prefix}${q.type}`);
    }
  };

  const pushLyricsRound = (round, row) => {
    rounds.push({
      slotId: round.slotId,
      lyrics: round.lyrics,
      revealClip: round.revealClip,
      questions: [{ ...round.question, type: round.type }],
    });
    usedLyricIds.add(row.id);
    typeTally[round.type] = (typeTally[round.type] ?? 0) + 1;
    if (degenerate.has(round.type)) fired.add(round.type);
  };

  /* ── Featured reservation (traditional audio only) ────── */
  const wantsFeatured = activeAudioOrder.includes('name-featured');
  if (wantsFeatured && traditionalCount > 0 && wantsAudio) {
    const featuredPool = await pickFeaturedSlots(
      env, workIds, traditionalCount * 2, years, usedRendition
    );
    const featuredLimit = Math.min(
      featuredQuota(traditionalCount, activeAudioOrder),
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
        tallyQuestions(round);
      }
    }
  }

  /* ── Instrumental pass (capped at instrumentalCount) ──── */
  if (instrumentalCount > 0 && instrumentSlots.length > 0) {
    let built = 0;
    for (let i = 0; i < instrumentSlots.length && built < instrumentalCount; i++) {
      const slot = instrumentSlots[i];
      if (usedInstrumentSlotIds.has(slot.id)) continue;

      const round = await buildInstrumentalRoundMulti(
        env, request, slot, requestedTypes, scopeArtistIds,
        i, typeTally, degenerateState, lyricsByKey
      );
      if (round && round.questions.length > 0) {
        rounds.push(round);
        usedInstrumentSlotIds.add(slot.id);
        built += 1;
        tallyQuestions(round, 'instr:');
      }
    }
  }

  /* ── Pass B: mixed fill (traditional audio + lyrics) ──── */
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
        tallyQuestions(round);
      }
    } else if (li < lyricsRows.length) {
      const row = lyricsRows[li++];
      if (usedLyricIds.has(row.id)) continue;
      const round = await buildLyricsRound(
        env, request, row, requestedTypes, scopeArtistIds, i, typeTally, degenerateState
      );
      if (round) pushLyricsRound(round, row);
    }
  }

  /* ── Fallback pass: audio ─────────────────────────────── */
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
        tallyQuestions(round);
      }
    }
  }

  /* ── Fallback pass: lyrics ────────────────────────────── */
  if (rounds.length < count) {
    for (const row of lyricsRows) {
      if (rounds.length >= count) break;
      if (usedLyricIds.has(row.id)) continue;
      const round = await buildLyricsRound(
        env, request, row, requestedTypes, scopeArtistIds, li, typeTally, degenerateState
      );
      if (round) pushLyricsRound(round, row);
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
        workArtistCount: workIds.length,
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
      requestedRendition: rendition,
      usedRendition,
      requestedInstruments: instrumentsMode,
      instrumentRounds: rounds.filter(r => r.source === 'instrumental').length,
      generatedAt: new Date().toISOString(),
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   buildRoundMulti: one clip, up to 5 audio questions.
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

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}