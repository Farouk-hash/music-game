// music-game-wrangler/src/controllers/game/rounds-methods/resolvers.js
import { chunkedIn, D1_CHUNK_SIZE } from '../../../utilities/chunkedIn.js';
import { shuffle } from '../../../utilities/shuffle.js';
import { getCatalogFromKV, buildCatalogIndex } from '../../../lib/cache.js';

export async function artistsByIds(env, ids) {
  if (!ids.length) return [];
  const catalog = await getCatalogFromKV(env);
  if (catalog) {
    const idx = buildCatalogIndex(catalog);
    return ids.filter(id => {
      const a = idx.artistsById.get(id);
      return a && (a.tracks_count ?? 0) > 0;
    });
  }
  const rows = await chunkedIn(ids, D1_CHUNK_SIZE, async (chunk) => {
    const placeholders = chunk.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id FROM artists WHERE id IN (${placeholders}) AND tracks_count > 0`
    ).bind(...chunk).all();
    return results ?? [];
  });
  return rows.map(r => r.id);
}

export async function artistsByGenres(env, genreIds) {
  const catalog = await getCatalogFromKV(env);
  if (catalog) {
    const idx = buildCatalogIndex(catalog);
    const seen = new Set();
    for (const g of genreIds) {
      const set = idx.artistsByGenre.get(g);
      if (set) for (const id of set) seen.add(id);
    }
    return [...seen];
  }
  const placeholders = genreIds.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.id
     FROM artists a, json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) IN (${placeholders})
       AND a.tracks_count > 0`
  ).bind(...genreIds).all();
  return (results ?? []).map(r => r.id);
}

export async function allArtistsWithClips(env) {
  const catalog = await getCatalogFromKV(env);
  if (catalog) {
    const idx = buildCatalogIndex(catalog);
    return [...idx.artistsById.values()]
      .filter(a => (a.tracks_count ?? 0) > 0)
      .map(a => a.id);
  }
  const { results } = await env.DB.prepare(
    'SELECT id FROM artists WHERE tracks_count > 0'
  ).all();
  return (results ?? []).map(r => r.id);
}

export async function artistsInGenre(env, genreId) {
  const catalog = await getCatalogFromKV(env);
  if (catalog) {
    const idx = buildCatalogIndex(catalog);
    const set = idx.artistsByGenre.get(genreId);
    if (!set) return [];
    return shuffle([...set].map(id => idx.artistsById.get(id)).filter(Boolean));
  }
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.name
     FROM artists a, json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) = ?
       AND a.tracks_count > 0`
  ).bind(genreId).all();
  return shuffle(results ?? []);
}