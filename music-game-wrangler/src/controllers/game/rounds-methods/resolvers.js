import { chunkedIn , D1_CHUNK_SIZE } from "../../../utilities/chunkedIn";
import { shuffle } from "../../../utilities/shuffle";

/* ═══════════════════════════════════════════════════════════
   Scope resolvers
   ═══════════════════════════════════════════════════════════ */
export async function artistsByIds(env, ids) {
  if (!ids.length) return [];
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
  const { results } = await env.DB.prepare(
    'SELECT id FROM artists WHERE tracks_count > 0'
  ).all();
  return (results ?? []).map(r => r.id);
}

export async function artistsInGenre(env, genreId) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.name
     FROM artists a, json_each(a.genre_ids) g
     WHERE CAST(g.value AS INTEGER) = ?
       AND a.tracks_count > 0`
  ).bind(genreId).all();
  return shuffle(results ?? []);
}
