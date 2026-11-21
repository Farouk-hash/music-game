// src/lib/cache/catalog.js

const TTL_MS = 60_000;
let memo = { t: 0, value: null }; // resolved value only (no shared promises)

/**
 * Read the cached catalog from KV (memoized per isolate for 60s).
 * Returns null if cold.
 */
export async function getCatalogFromKV(env) {
  if (!env.CATALOG_CACHE) return null;
  if (memo.value && Date.now() - memo.t < TTL_MS) return memo.value;
  try {
    const v = await env.CATALOG_CACHE.get('catalog:v1', { type: 'json', cacheTtl: 60 });
    if (v) memo = { t: Date.now(), value: v };
    return v;
  } catch (err) {
    console.warn('catalog KV read failed', err?.message);
    return null;
  }
}

const indexCache = new WeakMap();

/**
 * Synchronous in-memory index over a catalog object (built once per catalog object).
 *   artistsById:     Map<id, artist>
 *   artistsByGenre:  Map<genre_id, Set<artist_id>>
 *   artistsByYear:   Map<year, Set<artist_id>>
 *   artistsWithClips: artist_id[]   (tracks_count > 0)
 */
export function buildCatalogIndex(catalog) {
  const cached = indexCache.get(catalog);
  if (cached) return cached;

  const artistsById = new Map();
  const artistsByGenre = new Map();
  const artistsByYear = new Map();
  const artistsWithClips = [];

  for (const artist of catalog.artists ?? []) {
    artistsById.set(artist.id, artist);
    if ((artist.tracks_count ?? 0) > 0) artistsWithClips.push(artist.id);
    for (const genreId of artist.genre_ids ?? []) {
      if (!artistsByGenre.has(genreId)) artistsByGenre.set(genreId, new Set());
      artistsByGenre.get(genreId).add(artist.id);
    }
  }

  for (const { year, artist_ids } of catalog.years ?? []) {
    if (!artistsByYear.has(year)) artistsByYear.set(year, new Set());
    const set = artistsByYear.get(year);
    for (const artistId of artist_ids) set.add(artistId);
  }

  const idx = { artistsById, artistsByGenre, artistsByYear, artistsWithClips };
  indexCache.set(catalog, idx);
  return idx;
}