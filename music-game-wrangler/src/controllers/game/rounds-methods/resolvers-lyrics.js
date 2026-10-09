// music-game-wrangler/src/controllers/game/rounds-methods/resolvers-lyrics.js
import { chunkedIn, D1_CHUNK_SIZE } from '../../../utilities/chunkedIn.js';
import { shuffle } from '../../../utilities/shuffle.js';

/* ═══════════════════════════════════════════════════════════
   Lyrics-scope resolvers.

   Each returns rows shaped as:
     { id, artist_id, track_name, lyrics, artist_name,
       album_name, reveal_r2_key }

   - `album_name` is joined from tracks (nullable, 52% coverage).
   - `reveal_r2_key` is the r2_key of any forward clip for this
     song — used by the client to let the player hear the song
     after answering. Picks the first available row; position
     doesn't matter.
   - Rows with `length(lyrics) < 200` are excluded.
   ═══════════════════════════════════════════════════════════ */

const MIN_LYRICS_LEN = 200;

const LYRIC_COLUMNS = `
  l.id,
  l.artist_id,
  l.track_name,
  l.lyrics,
  a.name AS artist_name,
  (SELECT t.album_name FROM tracks t
   WHERE t.artist_id = l.artist_id AND t.name = l.track_name
   LIMIT 1) AS album_name,
  (SELECT t.r2_key FROM tracks t
   WHERE t.artist_id = l.artist_id AND t.name = l.track_name
     AND t.r2_key IS NOT NULL
   LIMIT 1) AS reveal_r2_key
`;

const FROM_CLAUSE = `
  FROM lyrics l
  JOIN artists a ON a.id = l.artist_id
`;

const BASE_WHERE = `
  WHERE l.lyrics IS NOT NULL
    AND length(l.lyrics) >= ${MIN_LYRICS_LEN}
`;

export async function lyricsByIds(env, ids) {
  if (!ids.length) return [];
  return chunkedIn(ids, D1_CHUNK_SIZE, async (chunk) => {
    const ph = chunk.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT ${LYRIC_COLUMNS}
       ${FROM_CLAUSE}
       ${BASE_WHERE}
         AND l.artist_id IN (${ph})`
    ).bind(...chunk).all();
    return results ?? [];
  });
}

export async function lyricsByGenres(env, genreIds) {
  if (!genreIds.length) return [];
  const ph = genreIds.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT ${LYRIC_COLUMNS}
     ${FROM_CLAUSE}
     , json_each(a.genre_ids) g
     ${BASE_WHERE}
       AND CAST(g.value AS INTEGER) IN (${ph})`
  ).bind(...genreIds).all();
  return results ?? [];
}

export async function lyricsByYears(env, years) {
  if (!years.length) return [];
  const ph = years.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT ${LYRIC_COLUMNS}
     ${FROM_CLAUSE}
     JOIN tracks t2
       ON t2.artist_id = l.artist_id AND t2.name = l.track_name
     JOIN album_years ay
       ON ay.artist_id = t2.artist_id AND ay.album_name = t2.album_name
     ${BASE_WHERE}
       AND ay.released_year IN (${ph})`
  ).bind(...years).all();
  return results ?? [];
}

export async function allLyrics(env, limit = 200) {
  const { results } = await env.DB.prepare(
    `SELECT ${LYRIC_COLUMNS}
     ${FROM_CLAUSE}
     ${BASE_WHERE}
     LIMIT ?`
  ).bind(limit).all();
  return shuffle(results ?? []);
}