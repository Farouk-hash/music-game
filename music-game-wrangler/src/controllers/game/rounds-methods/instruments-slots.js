// rounds-methods/instruments-slots.js
import { shuffle } from '../../../utilities/shuffle.js';
import { loadArtistData } from '../../../lib/cache.js';

function roundRobin(rows, limit) {
  const byArtist = new Map();
  for (const r of rows) {
    if (!byArtist.has(r.artist_id)) byArtist.set(r.artist_id, []);
    byArtist.get(r.artist_id).push(r);
  }
  // Always use the return value; these arrays are fresh, so shuffling is safe.
  const buckets = [...byArtist.values()].map((arr) => shuffle(arr));

  const out = [];
  let progress = true;
  while (out.length < limit && progress) {
    progress = false;
    for (const arr of buckets) {
      if (arr.length === 0) continue;
      progress = true;
      out.push(arr.pop());
      if (out.length >= limit) break;
    }
  }
  return shuffle(out);
}

export async function fetchInstrumentSlots(env, scopeArtistIds, limit, years = []) {
  if (!scopeArtistIds.length || limit <= 0) return [];

  const data = await loadArtistData(env, 'core', scopeArtistIds);
  const yearSet = new Set(years);
  const rows = [];

  for (const id of scopeArtistIds) {
    const d = data.get(String(id));
    if (!d) continue;
    for (const r of d.i ?? []) {
      if (years.length > 0) {
        const y = d.y?.[r.album_name];
        if (y == null || !yearSet.has(y)) continue;
      }
      rows.push(r);
    }
  }
  return roundRobin(rows, limit);
}