// music-game-wrangler/src/controllers/game/rounds-methods/buildingLyrics.js
import { normalize } from '../../../utilities/normalize.js';
import { shuffle } from '../../../utilities/shuffle.js';
import { LYRICS_TYPES } from './scope-helpers.js';
import {
  albumNameDistractors,
  artistNameDistractors,
  trackNameDistractors,
} from './distractors.js';
import { extractMiddleSnippet } from './lyric-snippets.js';


export async function buildLyricsRound(
  env, request, lyricRow, requestedTypes, scopeArtistIds,
  slotIndex, typeTally, degenerateState
) {
  const eligibleRequested = (Array.isArray(requestedTypes) ? requestedTypes : [])
  .filter(t => LYRICS_TYPES.has(t));

  const isMixed = eligibleRequested.length === 0;

  const degenerate = degenerateState?.degenerate ?? new Set();
  const fired      = degenerateState?.fired      ?? new Set();

  function canBuild(type) {
    if (!LYRICS_TYPES.has(type)) return false;
    if (degenerate.has(type) && fired.has(type)) return false;
    if (type === 'lyrics-artist' && scopeArtistIds.length < 2) return false;
    if (type === 'lyrics-album'  && !lyricRow.album_name) return false;
    return true;
  }

  if (!isMixed) {
    const eligible = eligibleRequested.filter(canBuild);
    if (eligible.length === 0) return null;

    const preferred = eligible[slotIndex % eligible.length];
    const ordered = [preferred, ...eligible.filter(t => t !== preferred)];

    for (const t of ordered) {
      const round = await tryBuildLyrics(env, request, lyricRow, t, scopeArtistIds);
      if (round) return round;
    }
    return null;
  }

  const eligible = [...LYRICS_TYPES].filter(canBuild);
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
    const round = await tryBuildLyrics(env, request, lyricRow, type, scopeArtistIds);
    if (round) return round;
  }
  return null;
}

export async function tryBuildLyrics(env, request, lyricRow, type, scopeArtistIds) {
  const snippet = extractMiddleSnippet(lyricRow.lyrics);
  if (!snippet) return null;

  const origin = new URL(request.url).origin;

  // Reveal clip — the song the lyric came from, offered to the
  // player after they answer. Null when the song has no forward clip.
  const revealClip = lyricRow.reveal_r2_key
    ? {
        r2_key: lyricRow.reveal_r2_key,
        serveUrl: `${origin}/clips/serve?key=${encodeURIComponent(lyricRow.reveal_r2_key)}`,
      }
    : null;

  if (type === 'lyrics-track') {
    const distractors = await trackNameDistractors(
      env, lyricRow.artist_id, lyricRow.track_name, scopeArtistIds
    );
    if (distractors.length < 3) return null;
    const options = shuffle([lyricRow.track_name, ...distractors]);
    return {
      slotId: lyricRow.id,
      type,
      lyrics: snippet,
      revealClip,
      question: {
        prompt: 'What is the name of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(lyricRow.track_name),
      },
    };
  }

  if (type === 'lyrics-artist') {
    const artistRow = await env.DB.prepare(
      'SELECT id, name, genre_ids FROM artists WHERE id = ?'
    ).bind(lyricRow.artist_id).first();
    if (!artistRow) return null;

    const distractors = await artistNameDistractors(env, artistRow, scopeArtistIds);
    if (distractors.length < 3) return null;

    const options = shuffle([artistRow.name, ...distractors]);
    return {
      slotId: lyricRow.id,
      type,
      lyrics: snippet,
      revealClip,
      question: {
        prompt: 'Who is the artist of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(artistRow.name),
      },
    };
  }

  if (type === 'lyrics-album') {
    if (!lyricRow.album_name) return null;
    const distractors = await albumNameDistractors(
      env, lyricRow.artist_id, lyricRow.album_name, scopeArtistIds
    );
    if (distractors.length < 3) return null;
    const options = shuffle([lyricRow.album_name, ...distractors]);
    return {
      slotId: lyricRow.id,
      type,
      lyrics: snippet,
      revealClip,
      question: {
        prompt: 'What is the album of this track?',
        options: options.map(n => ({ label: n, value: normalize(n) })),
        correctValue: normalize(lyricRow.album_name),
      },
    };
  }

  return null;
}