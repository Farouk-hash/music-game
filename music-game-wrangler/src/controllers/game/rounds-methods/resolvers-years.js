// rounds-methods/resolvers-years.js
//
// Year scoping now comes from the (small, memoized) catalog index instead of
// scanning a global albumYearMap. D1 is only used when the catalog is cold.

import { chunkedIn, D1_CHUNK_SIZE } from '../../../utilities/chunkedIn.js';
import { shuffle } from '../../../utilities/shuffle.js';
import { getCatalogFromKV, buildCatalogIndex } from '../../../lib/cache.js';

const hasClips = (idx, id) => (idx.artistsById.get(id)?.tracks_count ?? 0) > 0;

/** Set of artist ids that have an album in any of `years` (and clips). */
function artistsInYears(idx, years) {
  const out = new Set();
  for (const y of years) {
    const set = idx.artistsByYear.get(y);
    if (!set) continue;
    for (const id of set) if (hasClips(idx, id)) out.add(id);
  }
  return out;
}

export async function artistsByYears(env, years) {
  if (!years.length) return [];
  const cat = await getCatalogFromKV(env);
  if (cat) return [...artistsInYears(buildCatalogIndex(cat), years)];

  const ph = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT t.artist_id AS id
       FROM tracks t
       JOIN album_years ay ON ay.artist_id = t.artist_id AND ay.album_name = t.album_name
      WHERE t.r2_key IS NOT NULL AND ay.released_year IN (${ph})`
  ).bind(...years).all();
  return (results ?? []).map((r) => r.id);
}

export async function artistsByIdsAndYears(env, ids, years) {
  if (!ids.length || !years.length) return [];
  const cat = await getCatalogFromKV(env);
  if (cat) {
    const inYears = artistsInYears(buildCatalogIndex(cat), years);
    return ids.filter((id) => inYears.has(id));
  }

  const yearPh = years.map(() => '?').join(',');
  const rows = await chunkedIn(ids, D1_CHUNK_SIZE, async (chunk) => {
    const idPh = chunk.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT t.artist_id AS id
         FROM tracks t
         JOIN album_years ay ON ay.artist_id = t.artist_id AND ay.album_name = t.album_name
        WHERE t.artist_id IN (${idPh}) AND t.r2_key IS NOT NULL
          AND ay.released_year IN (${yearPh})`
    ).bind(...chunk, ...years).all();
    return results ?? [];
  });
  return rows.map((r) => r.id);
}

export async function artistsByGenresAndYears(env, genreIds, years) {
  if (!genreIds.length || !years.length) return [];
  const cat = await getCatalogFromKV(env);
  if (cat) {
    const idx = buildCatalogIndex(cat);
    const inYears = artistsInYears(idx, years);
    const out = new Set();
    for (const g of genreIds) {
      const set = idx.artistsByGenre.get(g);
      if (!set) continue;
      for (const id of set) if (inYears.has(id)) out.add(id);
    }
    return [...out];
  }

  const genrePh = genreIds.map(() => '?').join(',');
  const yearPh = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT t.artist_id AS id
       FROM tracks t
       JOIN album_years ay ON ay.artist_id = t.artist_id AND ay.album_name = t.album_name
       JOIN artists a ON a.id = t.artist_id, json_each(a.genre_ids) g
      WHERE CAST(g.value AS INTEGER) IN (${genrePh})
        AND t.r2_key IS NOT NULL AND ay.released_year IN (${yearPh})`
  ).bind(...genreIds, ...years).all();
  return (results ?? []).map((r) => r.id);
}

/** Artists in one genre that also have an album in `years`. Linear, no per-artist scans. */
export async function artistsInGenreAndYears(env, genreId, years) {
  if (!years.length) return [];
  const cat = await getCatalogFromKV(env);
  if (cat) {
    const idx = buildCatalogIndex(cat);
    const genreSet = idx.artistsByGenre.get(genreId);
    if (!genreSet) return [];
    const inYears = artistsInYears(idx, years);
    const out = [];
    for (const id of genreSet) {
      if (!inYears.has(id)) continue;
      const a = idx.artistsById.get(id);
      if (a) out.push({ id, name: a.name });
    }
    return shuffle(out);
  }

  const yearPh = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.name
       FROM tracks t
       JOIN album_years ay ON ay.artist_id = t.artist_id AND ay.album_name = t.album_name
       JOIN artists a ON a.id = t.artist_id, json_each(a.genre_ids) g
      WHERE CAST(g.value AS INTEGER) = ? AND t.r2_key IS NOT NULL
        AND ay.released_year IN (${yearPh})`
  ).bind(genreId, ...years).all();
  return shuffle(results ?? []);
}