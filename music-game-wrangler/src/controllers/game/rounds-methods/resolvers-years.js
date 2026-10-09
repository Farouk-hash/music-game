// music-game-wrangler/src/controllers/game/rounds-methods/resolvers-years.js
import { chunkedIn } from '../../../utilities/chunkedIn.js';
import { shuffle } from '../../../utilities/shuffle.js';

/* ═══════════════════════════════════════════════════════════
   Year-aware scope resolvers.

   Most return an array of artist_id numbers, matching the shape
   of the resolvers in ./resolvers.js so downstream code is agnostic.

   `artistsInGenreAndYears` returns { id, name } objects, matching
   `artistsInGenre` in ./resolvers.js, because round-sets.js uses
   the name field for question building.

   All queries join tracks → album_years on (artist_id, album_name).
   The join is 100% reliable against the current D1 data (verified:
   8689/8689 matched). If that ever drops, add a normalization step.
   ═══════════════════════════════════════════════════════════ */

/**
 * Artists who have at least one forward clip whose album year is
 * in the given list. No other scope filter.
 */
export async function artistsByYears(env, years) {
  if (!years.length) return [];
  const placeholders = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT t.artist_id AS id
     FROM tracks t
     JOIN album_years ay
       ON ay.artist_id = t.artist_id
      AND ay.album_name = t.album_name
     WHERE t.r2_key IS NOT NULL
       AND ay.released_year IN (${placeholders})`
  ).bind(...years).all();
  return (results ?? []).map(r => r.id);
}

/**
 * Artists that are (a) in the given artist list AND (b) have at
 * least one forward clip whose album year is in the given list.
 */
export async function artistsByIdsAndYears(env, ids, years) {
  if (!ids.length || !years.length) return [];
  const yearPh = years.map(() => '?').join(',');
  const rows = await chunkedIn(ids, D1_CHUNK_SIZE, async (chunk) => {
    const idPh = chunk.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT t.artist_id AS id
       FROM tracks t
       JOIN album_years ay
         ON ay.artist_id = t.artist_id
        AND ay.album_name = t.album_name
       WHERE t.artist_id IN (${idPh})
         AND t.r2_key IS NOT NULL
         AND ay.released_year IN (${yearPh})`
    ).bind(...chunk, ...years).all();
    return results ?? [];
  });
  // DISTINCT across chunks is deduped here since chunks are disjoint.
  return rows.map(r => r.id);
}

/**
 * Artists that are (a) in any of the given genres AND (b) have at
 * least one forward clip whose album year is in the given list.
 */
export async function artistsByGenresAndYears(env, genreIds, years) {
  if (!genreIds.length || !years.length) return [];
  const genrePh = genreIds.map(() => '?').join(',');
  const yearPh = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT t.artist_id AS id
     FROM tracks t
     JOIN album_years ay
       ON ay.artist_id = t.artist_id
      AND ay.album_name = t.album_name
     JOIN artists a ON a.id = t.artist_id
     , json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) IN (${genrePh})
       AND t.r2_key IS NOT NULL
       AND ay.released_year IN (${yearPh})`
  ).bind(...genreIds, ...years).all();
  return (results ?? []).map(r => r.id);
}

/**
 * Artists in a single genre who have at least one forward clip
 * whose album year is in the given list. Returns { id, name }
 * objects — same shape as `artistsInGenre` in ./resolvers.js —
 * because round-sets.js uses the name for question building.
 *
 * Shuffled so callers get randomized order, matching `artistsInGenre`.
 */
export async function artistsInGenreAndYears(env, genreId, years) {
  if (!years.length) return [];
  const yearPh = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.name
     FROM tracks t
     JOIN album_years ay
       ON ay.artist_id = t.artist_id
      AND ay.album_name = t.album_name
     JOIN artists a ON a.id = t.artist_id
     , json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) = ?
       AND t.r2_key IS NOT NULL
       AND ay.released_year IN (${yearPh})`
  ).bind(genreId, ...years).all();
  return shuffle(results ?? []);
}