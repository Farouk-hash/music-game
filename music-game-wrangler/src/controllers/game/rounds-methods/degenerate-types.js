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
export function computeDegenerateTypes(
  audioSlots,
  lyricsRows,
  scopeArtistIds,
  instrumentSlots = []
) {
  const out = new Set();

  /* ── Shared across sources ──────────────────────────────
     Artist/featured variety is a scope property, so both
     sources share the degeneracy flag. */

  if (scopeArtistIds.length < 2) {
    out.add('name-artist');
    out.add('instr:name-artist');
  }

  const audioFeats = new Set();
  const scanFeatured = (slots) => {
    for (const s of slots) {
      if (!s.featured_artists) continue;
      for (const n of s.featured_artists.split(',').map(x => x.trim()).filter(Boolean)) {
        audioFeats.add(n);
      }
    }
  };
  scanFeatured(audioSlots);
  scanFeatured(instrumentSlots);
  if (audioFeats.size < 2) {
    out.add('name-featured');
    out.add('instr:name-featured');
  }

  /* ── Split by source ────────────────────────────────────
     Album variety is computed per-pool. An instrument may
     reference an album that no audio slot does. */

  const audioAlbums = new Set();
  for (const s of audioSlots) if (s.album_name) audioAlbums.add(s.album_name);
  if (audioAlbums.size < 2) out.add('name-album');

  const instrAlbums = new Set();
  for (const s of instrumentSlots) if (s.album_name) instrAlbums.add(s.album_name);
  if (instrAlbums.size < 2) out.add('instr:name-album');

  /* ── Lyrics-side types ─────────────────────────────────── */

  if (scopeArtistIds.length < 2) out.add('lyrics-artist');

  const lyricAlbums = new Set();
  for (const l of lyricsRows) if (l.album_name) lyricAlbums.add(l.album_name);
  if (lyricAlbums.size < 2) out.add('lyrics-album');

  // `lyrics-track` — only used by instrumental rounds. Not degenerate
  // because each track has a unique snippet.
  // `instr:lyrics-track` — same reasoning.

  return out;
}