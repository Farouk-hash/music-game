// music-game-wrangler/src/controllers/game/rounds-methods/buildingInstrumental.js
import { normalize } from '../../../utilities/normalize.js';
import { shuffle } from '../../../utilities/shuffle.js';
import {
  albumNameDistractors,
  artistNameDistractors,
  trackNameDistractors,
} from './distractors.js';
import { buildDistractorPool } from './instruments-lyrics-pool.js';

/* ═══════════════════════════════════════════════════════════
   Instrumental-round builders.

   Two entry points:

     buildInstrumentalRound(...)       — ONE question. Used by L1
                                          and L3. Returns
                                          { question: {...} }.

     buildInstrumentalRoundMulti(...)  — UP TO N questions.
                                          Used by L2. Returns
                                          { questions: [...] }.

   Five question types:
     name-track, name-artist, name-album, name-featured, lyrics-track

   `source: 'instrumental'` is stamped so the client renders the
   instrumental card.
   ═══════════════════════════════════════════════════════════ */

const VALID_INSTRUMENTAL_TYPES = new Set([
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'lyrics-track',
]);

/** Prefix a type for the instrument degeneracy set. */
function instrKey(type) {
  return `instr:${type}`;
}

/* ─────────────────────────────────────────────────────────────
   Single-question builder (L1 / L3) — UNCHANGED
   ───────────────────────────────────────────────────────────── */

export async function buildInstrumentalRound(
  env, request, slot, requestedTypes, scopeArtistIds,
  slotIndex, typeTally, degenerateState, lyricsByKey
) {
  const canAskArtist   = scopeArtistIds.length >= 2;
  const canAskAlbum    = !!slot.album_name;
  const canAskFeatured = !!slot.featured_artists;

  const degenerate = degenerateState?.degenerate ?? new Set();
  const fired      = degenerateState?.fired      ?? new Set();

  function slotSupports(type) {
    if (!VALID_INSTRUMENTAL_TYPES.has(type)) return false;
    if (degenerate.has(instrKey(type)) && fired.has(instrKey(type))) return false;
    if (type === 'name-artist'   && !canAskArtist)   return false;
    if (type === 'name-album'    && !canAskAlbum)    return false;
    if (type === 'name-featured' && !canAskFeatured) return false;
    if (type === 'lyrics-track') {
      const key = `${slot.artist_id}::${slot.name}`;
      if (!lyricsByKey?.has(key)) return false;
    }
    return true;
  }

  const baseSet = Array.isArray(requestedTypes) && requestedTypes.length > 0
    ? requestedTypes.filter(t => VALID_INSTRUMENTAL_TYPES.has(t))
    : [...VALID_INSTRUMENTAL_TYPES];

  const eligible = baseSet.filter(slotSupports);
  if (eligible.length === 0) return null;

  const ranked = eligible
    .map(t => ({ type: t, tally: typeTally?.[t] ?? 0 }))
    .sort((a, b) => {
      if (a.tally !== b.tally) return a.tally - b.tally;
      const ra = (slotIndex + eligible.indexOf(a.type)) % eligible.length;
      const rb = (slotIndex + eligible.indexOf(b.type)) % eligible.length;
      return ra - rb;
    });

  const origin = new URL(request.url).origin;
  const serveUrl = `${origin}/instrumentals/serve?key=${encodeURIComponent(slot.r2_key)}`;

  const tried = new Set();
  for (const { type } of ranked) {
    if (tried.has(type)) continue;
    tried.add(type);
    const q = await tryBuildInstrumentalQuestion(
      env, request, slot, type, scopeArtistIds, serveUrl, lyricsByKey
    );
    if (q) {
      return {
        slotId: slot.id,
        type: q.type,
        source: 'instrumental',
        clip: { r2_key: slot.r2_key, serveUrl, position: slot.position },
        question: q.question,
      };
    }
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────
   Multi-question builder (L2)

   Mirrors `buildRoundMulti` in round-mutli.js:
     - honors `requestedTypes` (empty → all types)
     - iterates eligible types, pushes up to QUESTIONS_PER_ROUND_CAP
     - skips degenerate+fired types
     - returns null if zero questions built
   ───────────────────────────────────────────────────────────── */

const QUESTIONS_PER_ROUND_CAP = 5;

export async function buildInstrumentalRoundMulti(
  env, request, slot, requestedTypes, scopeArtistIds,
  slotIndex, typeTally, degenerateState, lyricsByKey
) {
  const canAskArtist   = scopeArtistIds.length >= 2;
  const canAskAlbum    = !!slot.album_name;
  const canAskFeatured = !!slot.featured_artists;

  const degenerate = degenerateState?.degenerate ?? new Set();
  const fired      = degenerateState?.fired      ?? new Set();

  function slotSupports(type) {
    if (!VALID_INSTRUMENTAL_TYPES.has(type)) return false;
    if (degenerate.has(instrKey(type)) && fired.has(instrKey(type))) return false;
    if (type === 'name-artist'   && !canAskArtist)   return false;
    if (type === 'name-album'    && !canAskAlbum)    return false;
    if (type === 'name-featured' && !canAskFeatured) return false;
    if (type === 'lyrics-track') {
      const key = `${slot.artist_id}::${slot.name}`;
      if (!lyricsByKey?.has(key)) return false;
    }
    return true;
  }

  const baseSet = Array.isArray(requestedTypes) && requestedTypes.length > 0
    ? requestedTypes.filter(t => VALID_INSTRUMENTAL_TYPES.has(t))
    : [...VALID_INSTRUMENTAL_TYPES];

  const eligible = baseSet.filter(slotSupports);
  if (eligible.length === 0) return null;

  const origin = new URL(request.url).origin;
  const serveUrl = `${origin}/instrumentals/serve?key=${encodeURIComponent(slot.r2_key)}`;

  const questions = [];
  const tried = new Set();

  for (const type of eligible) {
    if (questions.length >= QUESTIONS_PER_ROUND_CAP) break;
    if (tried.has(type)) continue;
    tried.add(type);

    const q = await tryBuildInstrumentalQuestion(
      env, request, slot, type, scopeArtistIds, serveUrl, lyricsByKey
    );
    if (q && q.question) {
      questions.push({
        type: q.type,
        prompt: q.question.prompt,
        options: q.question.options,
        correctValue: q.question.correctValue,
      });
    }
  }

  if (questions.length === 0) return null;

  return {
    slotId: slot.id,
    source: 'instrumental',
    clip: { r2_key: slot.r2_key, serveUrl, position: slot.position },
    questions,
  };
}

/* ─────────────────────────────────────────────────────────────
   tryBuildInstrumentalQuestion — one type, one question.

   Returns `{ type, question: { prompt, options, correctValue } }`
   or null. Shared by both single- and multi-question builders.
   ───────────────────────────────────────────────────────────── */

async function tryBuildInstrumentalQuestion(
  env, request, slot, type, scopeArtistIds, serveUrl, lyricsByKey
) {
  if (type === 'name-track') {
    const distractors = await trackNameDistractors(
      env, slot.artist_id, slot.name, scopeArtistIds
    );
    if (distractors.length < 3) return null;
    const options = shuffle([slot.name, ...distractors]);
    return {
      type: 'name-track',
      question: {
        prompt: 'What is the name of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(slot.name),
      },
    };
  }

  if (type === 'name-artist') {
    const artistRow = await env.DB.prepare(
      'SELECT id, name, genre_ids FROM artists WHERE id = ?'
    ).bind(slot.artist_id).first();
    if (!artistRow) return null;

    const distractors = await artistNameDistractors(env, artistRow, scopeArtistIds);
    if (distractors.length < 3) return null;

    const options = shuffle([artistRow.name, ...distractors]);
    return {
      type: 'name-artist',
      question: {
        prompt: 'Who is the artist of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(artistRow.name),
      },
    };
  }

  if (type === 'name-album') {
    if (!slot.album_name) return null;
    const distractors = await albumNameDistractors(
      env, slot.artist_id, slot.album_name, scopeArtistIds
    );
    if (distractors.length < 3) return null;
    const options = shuffle([slot.album_name, ...distractors]);
    return {
      type: 'name-album',
      question: {
        prompt: 'What is the album of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(slot.album_name),
      },
    };
  }

  if (type === 'name-featured') {
    if (!slot.featured_artists) return null;

    const featuredNames = slot.featured_artists
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (featuredNames.length === 0) return null;

    const correctName = featuredNames[Math.floor(Math.random() * featuredNames.length)];

    const artistRow = await env.DB.prepare(
      'SELECT id, name, genre_ids FROM artists WHERE id = ?'
    ).bind(slot.artist_id).first();
    if (!artistRow) return null;

    const rawDistractors = await artistNameDistractors(env, artistRow, scopeArtistIds);
    const featuredNorm = new Set(featuredNames.map(normalize));
    const distractors = rawDistractors
      .filter(d => !featuredNorm.has(normalize(d)))
      .slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correctName, ...distractors]);
    return {
      type: 'name-featured',
      question: {
        prompt: 'Which artist is featured on this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(correctName),
      },
    };
  }

  if (type === 'lyrics-track') {
    const key = `${slot.artist_id}::${slot.name}`;
    const own = lyricsByKey?.get(key);
    if (!own) return null;

    const pool = buildDistractorPool(lyricsByKey, key);
    if (pool.length < 3) return null;

    const seenNorm = new Set([own.normalized]);
    const distractors = [];
    for (const candidate of shuffle(pool)) {
      if (distractors.length >= 3) break;
      if (seenNorm.has(candidate.normalized)) continue;
      seenNorm.add(candidate.normalized);
      distractors.push(candidate);
    }
    if (distractors.length < 3) return null;

    const rawOptions = shuffle([
      own.snippet,
      ...distractors.map(d => d.snippet),
    ]);

    return {
      type: 'lyrics-track',
      question: {
        prompt: 'Which lyric belongs to this track?',
        options: rawOptions.map(s => ({ label: s, value: s })),
        correctValue: own.snippet,
      },
    };
  }

  return null;
}