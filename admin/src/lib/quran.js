// src/lib/quran.js

/**
 * The Cloudflare genre ID reserved for Quran reciters.
 * The genre is created once by the admin and never changes.
 * Its current Cloudflare row:
 *   id: 123, name: "قران كريم", display_name: "(القرآن)"
 */
export const QURAN_GENRE_ID = 123;

/**
 * Determine whether an artist row is a Quran reciter.
 */
export function isReciter(artist) {
  if (!Array.isArray(artist?.genre_ids)) return false;
  return artist.genre_ids.includes(QURAN_GENRE_ID);
}

/**
 * Get the detail path for an artist row.
 * Returns "/quran/:id" for reciters, "/artists/:slug" for music artists.
 */
export function artistDetailPath(artist) {
  if (isReciter(artist)) {
    return `/quran/${artist.id}`;
  }
  return artist.wp_slug
    ? `/artists/${encodeURIComponent(artist.wp_slug)}`
    : `/artists/${artist.id}`;
}