// music-game-wrangler/src/controllers/game/rounds-methods/buildingRounds.js
import { normalize } from '../../../utilities/normalize.js';
import { shuffle } from '../../../utilities/shuffle.js';
import { AUDIO_TYPES } from './scope-helpers.js';
import { albumNameDistractors, artistNameDistractors, trackNameDistractors } from './distractors.js';

const FIXED_POSITIONS = ['start', 'middle', 'end', 'custom'];


/**
 * Build one round from the given slot.
 *
 * `requestedTypes` is an array of acceptable type strings.
 *   - [] means "mixed" — see below.
 *   - [x] means "strict" — build x, or return null if the slot can't.
 *   - [x, y] means "union" — pick one eligible type from {x, y},
 *     preferring x, then y, then null if neither is possible.
 *
 * `slotIndex` is the slot's position in the caller's pool.
 *
 * `typeTally` is a per-request counter of how many rounds of each
 * type have been produced so far. In mixed mode, the preferred
 * type is the eligible type with the smallest tally.
 *
 * `degenerateState` (optional) is `{ degenerate: Set, fired: Set }`:
 *   - degenerate: types whose answer is forced to a single value
 *     across the whole request's slot pool.
 *   - fired:      degenerate types that have already produced a
 *     round. A degenerate type is ineligible once fired.
 * The caller updates `fired` after each successful round.
 */
export async function buildRound(
  env, request, slot, requestedTypes, scopeArtistIds,
  slotIndex, typeTally, degenerateState
) {
  const canAskArtist   = scopeArtistIds.length >= 2;
  const canAskAlbum    = !!slot.album_name;
  const canAskFeatured = !!slot.featured_artists;

  const isMixed = !Array.isArray(requestedTypes) || requestedTypes.length === 0;

  const degenerate = degenerateState?.degenerate ?? new Set();
  const fired      = degenerateState?.fired      ?? new Set();

  function slotSupports(type) {
    // This builder only knows how to build audio questions.
    // Lyrics types are handled by buildLyricsRound.
    if (!AUDIO_TYPES.has(type)) return false;

    // Degenerate + already fired → permanently blocked for this request.
    if (degenerate.has(type) && fired.has(type)) return false;

    if (type === 'name-artist'   && !canAskArtist)   return false;
    if (type === 'name-album'    && !canAskAlbum)    return false;
    if (type === 'name-featured' && !canAskFeatured) return false;
    return true;
  }

  // ── Explicit-mode (single or multiple types) ─────────
  if (!isMixed) {
    const eligible = requestedTypes.filter(slotSupports);
    if (eligible.length === 0) return null;

    const preferred = eligible[slotIndex % eligible.length];

    const tried = new Set();
    const orderedAttempts = [
      preferred,
      ...eligible.filter(t => t !== preferred),
    ];
    for (const t of orderedAttempts) {
      if (tried.has(t)) continue;
      tried.add(t);
      const round = await tryBuild(env, request, slot, t, scopeArtistIds);
      if (round) return round;
    }
    return null;
  }

  // ── Mixed-mode: pick the eligible type with the smallest tally ──
 const eligible = [...AUDIO_TYPES].filter(slotSupports);

  if (eligible.length === 0) return null;

  const ranked = eligible
    .map(t => ({ type: t, tally: typeTally?.[t] ?? 0 }))
    .sort((a, b) => {
      if (a.tally !== b.tally) return a.tally - b.tally;
      const ra = (slotIndex + eligible.indexOf(a.type)) % eligible.length;
      const rb = (slotIndex + eligible.indexOf(b.type)) % eligible.length;
      return ra - rb;
    });

  const tried = new Set();
  for (const { type } of ranked) {
    if (tried.has(type)) continue;
    tried.add(type);
    const round = await tryBuild(env, request, slot, type, scopeArtistIds);
    if (round) return round;
  }
  return null;
}

/* tryBuild is unchanged */
export async function tryBuild(env, request, slot, type, scopeArtistIds) {
  const origin = new URL(request.url).origin;
  const serveUrl = `${origin}/clips/serve?key=${encodeURIComponent(slot.r2_key)}`;

  if (type === 'name-position') {
    const correct = slot.position ?? 'start';
    if (!FIXED_POSITIONS.includes(correct)) return null;
    return {
      slotId: slot.id,
      type: 'name-position',
      clip: { r2_key: slot.r2_key, serveUrl, position: null },
      question: {
        prompt: 'Where in the track is this clip from?',
        options: FIXED_POSITIONS.map(p => ({ label: p, value: p })),
        correctValue: correct,
      },
    };
  }

  if (type === 'name-track') {
    const distractors = await trackNameDistractors(
      env, slot.artist_id, slot.name, scopeArtistIds
    );
    if (distractors.length < 3) return null;
    const options = shuffle([slot.name, ...distractors]);
    return {
      slotId: slot.id,
      type: 'name-track',
      clip: { r2_key: slot.r2_key, serveUrl, position: slot.position },
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

    const distractors = await artistNameDistractors(
      env, artistRow, scopeArtistIds
    );
    if (distractors.length < 3) return null;

    const options = shuffle([artistRow.name, ...distractors]);
    return {
      slotId: slot.id,
      type: 'name-artist',
      clip: { r2_key: slot.r2_key, serveUrl, position: slot.position },
      question: {
        prompt: 'Who is the artist of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(artistRow.name),
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
      slotId: slot.id,
      type: 'name-featured',
      clip: { r2_key: slot.r2_key, serveUrl, position: slot.position },
      question: {
        prompt: 'Which artist is featured on this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(correctName),
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
      slotId: slot.id,
      type: 'name-album',
      clip: { r2_key: slot.r2_key, serveUrl, position: slot.position },
      question: {
        prompt: 'What is the album of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(slot.album_name),
      },
    };
  }

  return null;
}