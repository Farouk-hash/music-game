// admin/src/hooks/cloud-flare/useArtistCatalogue.js

/**
 * Fetches the full catalogue for a single artist:
 * all tracks (with album attribution) + all albums.
 *
 * Called imperatively by useBulkPublish.
 */
export async function fetchArtistCatalogue(slug) {
  const res = await fetch(
    `/api/artists/${encodeURIComponent(slug)}/catalogue`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Catalogue fetch failed (${res.status}): ${text.slice(0, 200)}`
    );
  }
  return res.json();
}