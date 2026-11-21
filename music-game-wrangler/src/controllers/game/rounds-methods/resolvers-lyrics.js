// rounds-methods/resolvers-lyrics.js
//
// Full lyric rows are stored per artist (pool:v2:lyr:{id}). To keep CPU low,
// every resolver loads at most FALLBACK_ARTISTS artists. Callers should pass
// the small "work set" of artist ids (see rounds.js) to lyricsByIds.

import { shuffle } from '../../../utilities/shuffle.js';
import {
  loadArtistData,
  getCatalogFromKV,
  buildCatalogIndex,
} from '../../../lib/cache.js';

const FALLBACK_ARTISTS = 8;

function sample(arr, n) {
  return shuffle(arr.slice()).slice(0, n);
}

export async function lyricsByIds(env, ids) {
  if (!ids.length) return [];
  const data = await loadArtistData(env, 'lyr', ids);
  const out = [];
  for (const id of ids) {
    const rows = data.get(String(id));
    if (rows) for (const r of rows) out.push(r);
  }
  return out;
}

export async function lyricsByGenres(env, genreIds) {
  if (!genreIds.length) return [];
  const cat = await getCatalogFromKV(env);
  if (!cat) return [];
  const idx = buildCatalogIndex(cat);
  const ids = new Set();
  for (const g of genreIds) {
    const set = idx.artistsByGenre.get(g);
    if (set) for (const id of set) ids.add(id);
  }
  return lyricsByIds(env, sample([...ids], FALLBACK_ARTISTS));
}

export async function lyricsByYears(env, years) {
  if (!years.length) return [];
  const cat = await getCatalogFromKV(env);
  if (!cat) return [];
  const idx = buildCatalogIndex(cat);
  const ids = new Set();
  for (const y of years) {
    const set = idx.artistsByYear.get(y);
    if (set) for (const id of set) ids.add(id);
  }
  return lyricsByIds(env, sample([...ids], FALLBACK_ARTISTS));
}

export async function allLyrics(env, limit = 200) {
  const cat = await getCatalogFromKV(env);
  if (!cat) return [];
  const idx = buildCatalogIndex(cat);
  const rows = await lyricsByIds(env, sample(idx.artistsWithClips, FALLBACK_ARTISTS));
  return shuffle(rows).slice(0, limit);
}