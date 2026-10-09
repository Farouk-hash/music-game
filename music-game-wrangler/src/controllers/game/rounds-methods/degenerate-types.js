// music-game-wrangler/src/controllers/game/rounds-methods/degenerate-types.js
/* ═══════════════════════════════════════════════════════════
   Degenerate-type detection — audio + lyrics.

   A type is "degenerate" when its correct answer is forced to a
   single value across the request's whole pool. Degenerate types
   may appear at most ONCE per request; after one round of that
   type has been produced, the type is blocked.

   Two pools:
     - audioSlots  — rows from tracks (with r2_key)
     - lyricsRows  — rows from lyrics (with usable text)
   ═══════════════════════════════════════════════════════════ */

/**
 * @param {Array} audioSlots     - forward-clip slots
 * @param {Array} lyricsRows     - lyric rows with artist_id, track_name,
 *                                 album_name, artist_name
 * @param {Array<number>} scopeArtistIds
 * @returns {Set<string>}
 */
export function computeDegenerateTypes(audioSlots, lyricsRows, scopeArtistIds) {
  const out = new Set();

  // ── Audio-side types ────────────────────────────────────
  if (scopeArtistIds.length < 2) out.add('name-artist');

  const audioAlbums = new Set();
  for (const s of audioSlots) if (s.album_name) audioAlbums.add(s.album_name);
  if (audioAlbums.size < 2) out.add('name-album');

  const audioFeats = new Set();
  for (const s of audioSlots) {
    if (!s.featured_artists) continue;
    for (const n of s.featured_artists.split(',').map(x => x.trim()).filter(Boolean)) {
      audioFeats.add(n);
    }
  }
  if (audioFeats.size < 2) out.add('name-featured');

  // ── Lyrics-side types ───────────────────────────────────
  if (scopeArtistIds.length < 2) out.add('lyrics-artist');

  const lyricAlbums = new Set();
  for (const l of lyricsRows) if (l.album_name) lyricAlbums.add(l.album_name);
  if (lyricAlbums.size < 2) out.add('lyrics-album');

  // lyrics-track is never degenerate — each song has a unique name.

  return out;
}