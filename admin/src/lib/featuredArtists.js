// admin/src/lib/featuredArtists.js

/**
 * Extract the collaborating artists' names from a matb3aa track.
 *
 * matb3aa returns each track with an `artists` array:
 *   [{ id: 264, name: 'مروان بابلو' }, { id: 386, name: 'ليجي سي' }]
 *
 * `featured_artists` = every entry whose id != primaryArtistId,
 * joined by ", " (ASCII comma + space). Returns null when empty.
 *
 * @param {object} track   matb3aa track object (has .artists)
 * @param {number} primaryArtistId  the artist we're publishing under
 * @returns {string|null}
 */
export function computeFeaturedArtists(track, primaryArtistId) {
  if (!Array.isArray(track?.artists)) return null;

  const names = track.artists
    .filter(a => a && a.id !== primaryArtistId && typeof a.name === 'string')
    .map(a => a.name.trim())
    .filter(Boolean);

  const unique = [...new Set(names)];

  return unique.length > 0 ? unique.join(', ') : null;
}