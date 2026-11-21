// rounds-methods/instruments-lyrics-pool.js
import { loadArtistData } from '../../../lib/cache.js';

/**
 * Map keyed by `artist_id::track_name` -> { artist_id, track_name, snippet, normalized }.
 * Snippets are precomputed at build time and live in the artist's core pool entry,
 * so this does no lyric parsing and no extra KV reads when core is already loaded.
 */
export async function fetchLyricsPool(env, scopeArtistIds) {
  const byKey = new Map();
  if (!scopeArtistIds.length) return byKey;

  const data = await loadArtistData(env, 'core', scopeArtistIds);
  for (const d of data.values()) {
    for (const s of d.s ?? []) {
      const key = `${s.artist_id}::${s.track_name}`;
      if (!byKey.has(key)) byKey.set(key, s);
    }
  }
  return byKey;
}

const entriesCache = new WeakMap();

function entriesOf(map) {
  let arr = entriesCache.get(map);
  if (!arr) {
    arr = [...map.values()];
    entriesCache.set(map, arr);
  }
  return arr;
}

/** Random sample of distractor snippets: no full copy, no full shuffle. */
export function pickLyricDistractors(lyricsByKey, excludeKey, ownNormalized, n = 3) {
  const arr = entriesOf(lyricsByKey);
  const out = [];
  const seen = new Set([ownNormalized]);
  const maxTries = n * 30;
  for (let t = 0; t < maxTries && out.length < n && arr.length > 0; t++) {
    const c = arr[Math.floor(Math.random() * arr.length)];
    if (`${c.artist_id}::${c.track_name}` === excludeKey) continue;
    if (seen.has(c.normalized)) continue;
    seen.add(c.normalized);
    out.push(c);
  }
  return out;
}

/** @deprecated kept for old imports; copies the whole map. Use pickLyricDistractors. */
export function buildDistractorPool(lyricsByKey, excludeKey) {
  const out = [];
  for (const [key, entry] of lyricsByKey) {
    if (key === excludeKey) continue;
    out.push(entry);
  }
  return out;
}