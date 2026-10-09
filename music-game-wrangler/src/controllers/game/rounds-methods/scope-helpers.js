// music-game-wrangler/src/controllers/game/rounds-methods/scope-helpers.js
import {
  allArtistsWithClips,
  artistsByGenres,
  artistsByIds,
} from './resolvers.js';
import {
  artistsByYears,
  artistsByIdsAndYears,
  artistsByGenresAndYears,
} from './resolvers-years.js';
import {
  lyricsByIds,
  lyricsByGenres,
  lyricsByYears,
  allLyrics,
} from './resolvers-lyrics.js';

/* ═══════════════════════════════════════════════════════════
   Type registries. These live here — not in rounds.js — to
   break the circular import cycle:

     rounds.js          →  buildingRounds.js  (via buildRound)
     buildingRounds.js  →  scope-helpers.js   (via VALID_TYPES)
     scope-helpers.js   →  (no back-edge)

   rounds.js re-exports VALID_TYPES for backwards compatibility.
   ═══════════════════════════════════════════════════════════ */

export const VALID_TYPES = [
  // audio
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'name-position',
  // lyrics
  'lyrics-track',
  'lyrics-artist',
  'lyrics-album',
];

export const AUDIO_TYPES = new Set([
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'name-position',
]);

export const LYRICS_TYPES = new Set([
  'lyrics-track',
  'lyrics-artist',
  'lyrics-album',
]);

export function emptyTally() {
  const t = {};
  for (const k of VALID_TYPES) t[k] = 0;
  return t;
}

export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ...rest of the file unchanged (resolveScope, resolveLyricsPool,
// pickLyricsVaried, parseRequestedTypes)
/**
 * Resolve the audio-side artist scope using the priority chain.
 *   No years:  artists > genres > all
 *   Years:     artists∩years > artists > genres∩years > genres > years > all
 */
export async function resolveScope(env, { artistIds, genreIds, years }) {
  const hasArtists = artistIds.length > 0;
  const hasGenres  = genreIds.length > 0;
  const hasYears   = years.length > 0;

  if (!hasYears) {
    if (hasArtists) {
      const ids = await artistsByIds(env, artistIds);
      if (ids.length > 0) return { ids, tier: 'artists' };
    }
    if (hasGenres) {
      const ids = await artistsByGenres(env, genreIds);
      if (ids.length > 0) return { ids, tier: 'genres' };
    }
    const ids = await allArtistsWithClips(env);
    return { ids, tier: 'all' };
  }

  if (hasArtists) {
    const ids = await artistsByIdsAndYears(env, artistIds, years);
    if (ids.length > 0) return { ids, tier: 'artists∩years' };
  }
  if (hasArtists) {
    const ids = await artistsByIds(env, artistIds);
    if (ids.length > 0) return { ids, tier: 'artists' };
  }
  if (hasGenres) {
    const ids = await artistsByGenresAndYears(env, genreIds, years);
    if (ids.length > 0) return { ids, tier: 'genres∩years' };
  }
  if (hasGenres) {
    const ids = await artistsByGenres(env, genreIds);
    if (ids.length > 0) return { ids, tier: 'genres' };
  }
  if (hasYears) {
    const ids = await artistsByYears(env, years);
    if (ids.length > 0) return { ids, tier: 'years' };
  }
  const ids = await allArtistsWithClips(env);
  return { ids, tier: 'all' };
}

/**
 * Fetch the lyrics pool for the current scope. Prefers the already-
 * resolved artist scope, then falls back to raw params.
 */
export async function resolveLyricsPool(env, { scopeArtistIds, genreIds, years }) {
  const artists = await lyricsByIds(env, scopeArtistIds);
  if (artists.length > 0) return artists;

  if (genreIds.length > 0) {
    const byGenre = await lyricsByGenres(env, genreIds);
    if (byGenre.length > 0) return byGenre;
  }
  if (years.length > 0) {
    const byYear = await lyricsByYears(env, years);
    if (byYear.length > 0) return byYear;
  }
  return allLyrics(env);
}

/**
 * Round-robin pick across lyric rows — same shape as pickSlotsVaried
 * but for lyric objects. Returns up to `count` rows, maximizing
 * artist diversity on the first pass.
 */
export function pickLyricsVaried(lyricsRows, count) {
  if (lyricsRows.length === 0) return [];

  const byArtist = new Map();
  for (const row of lyricsRows) {
    if (!byArtist.has(row.artist_id)) byArtist.set(row.artist_id, []);
    byArtist.get(row.artist_id).push(row);
  }
  for (const bucket of byArtist.values()) shuffleInPlace(bucket);

  const picked = [];
  const artistIds = shuffleInPlace([...byArtist.keys()]);

  // Pass 1: one per artist
  for (const id of artistIds) {
    if (picked.length >= count) break;
    const bucket = byArtist.get(id);
    if (bucket.length > 0) picked.push(bucket.shift());
  }

  // Subsequent passes
  let pass = 2;
  while (picked.length < count && pass < 100) {
    let addedAny = false;
    for (const id of shuffleInPlace([...byArtist.keys()])) {
      if (picked.length >= count) break;
      const bucket = byArtist.get(id);
      if (bucket.length > 0) {
        picked.push(bucket.shift());
        addedAny = true;
      }
    }
    if (!addedAny) break;
    pass += 1;
  }
  return picked;
}

/**
 * Parse the `types` query parameter. Shared by both endpoints.
 */
export function parseRequestedTypes(url) {
  const csv = url.searchParams.get('types');
  if (csv) {
    return csv
      .split(',')
      .map(s => s.trim())
      .filter(t => VALID_TYPES.includes(t));
  }
  const single = url.searchParams.get('type');
  if (!single || single === 'mixed') return [];
  return VALID_TYPES.includes(single) ? [single] : [];
}