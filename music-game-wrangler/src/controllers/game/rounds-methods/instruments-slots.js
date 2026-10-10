// music-game-wrangler/src/controllers/game/rounds-methods/instruments-slots.js
import { shuffle } from '../../../utilities/shuffle.js';
import { chunkedIn, D1_CHUNK_SIZE } from '../../../utilities/chunkedIn.js';

/* ═══════════════════════════════════════════════════════════
   Instrument slot fetcher.

   Pulls one row per (artist_id, track_name) at random from the
   `instruments` table. When a track has both 'middle' and
   'custom' rows, exactly one is picked — random per query.

   Joins `tracks` on (artist_id, name) to attach `featured_artists`
   (which the instruments table does NOT store).

   ── Anti-skew ──────────────────────────────────────────────
   A naive `ORDER BY RANDOM() LIMIT N` biases toward artists with
   more uploaded instrumentals (e.g. Amr Diab has 576 rows,
   Marwan Pablo has 116). We fetch a generous pool per scope, then
   round-robin across artists so the returned slots are balanced
   by artist, not by catalogue size.

   Fetch size = limit * artistCount * 2, capped at D1_CHUNK_SIZE*
   and a hard ceiling to keep the query bounded.
   ═══════════════════════════════════════════════════════════ */

const POOL_MULTIPLIER = 2;         // limit * artists * 2 rows fetched per query
const MAX_POOL = 2000;             // hard ceiling on rows fetched

export async function fetchInstrumentSlots(env, scopeArtistIds, limit, years = []) {
  if (!scopeArtistIds.length || limit <= 0) return [];

  const artistCount = scopeArtistIds.length;
  const fetchLimit = Math.min(
    MAX_POOL,
    Math.max(limit, limit * artistCount * POOL_MULTIPLIER)
  );

  const rows = [];

  await chunkedIn(scopeArtistIds, D1_CHUNK_SIZE, async (chunk) => {
    const idPh = chunk.map(() => '?').join(',');

    if (years.length > 0) {
      const yearPh = years.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `WITH ranked AS (
           SELECT i.id, i.artist_id, i.track_name, i.position, i.r2_key,
                  i.album_name,
                  ROW_NUMBER() OVER (
                    PARTITION BY i.artist_id, i.track_name
                    ORDER BY RANDOM()
                  ) AS rn
             FROM instruments i
            WHERE i.artist_id IN (${idPh})
         )
         SELECT r.id, r.artist_id, r.track_name AS name, r.position,
                r.r2_key, r.album_name,
                t.featured_artists
           FROM ranked r
           LEFT JOIN tracks t
             ON t.artist_id = r.artist_id
            AND t.name = r.track_name
           JOIN album_years ay
             ON ay.artist_id = r.artist_id
            AND ay.album_name = r.album_name
          WHERE r.rn = 1
            AND ay.released_year IN (${yearPh})
          ORDER BY RANDOM()
          LIMIT ?`
      ).bind(...chunk, ...years, fetchLimit).all();
      for (const r of results ?? []) rows.push(r);
    } else {
      const { results } = await env.DB.prepare(
        `WITH ranked AS (
           SELECT i.id, i.artist_id, i.track_name, i.position, i.r2_key,
                  i.album_name,
                  ROW_NUMBER() OVER (
                    PARTITION BY i.artist_id, i.track_name
                    ORDER BY RANDOM()
                  ) AS rn
             FROM instruments i
            WHERE i.artist_id IN (${idPh})
         )
         SELECT r.id, r.artist_id, r.track_name AS name, r.position,
                r.r2_key, r.album_name,
                t.featured_artists
           FROM ranked r
           LEFT JOIN tracks t
             ON t.artist_id = r.artist_id
            AND t.name = r.track_name
          WHERE r.rn = 1
          ORDER BY RANDOM()
          LIMIT ?`
      ).bind(...chunk, fetchLimit).all();
      for (const r of results ?? []) rows.push(r);
    }
    return [];
  });

  return roundRobin(rows, limit);
}

/* ─────────────────────────────────────────────────────────────
   roundRobin — pull slots in artist-turn order so no single artist
   floods the output. Preserves randomness within each artist's
   bucket (the SQL already did ORDER BY RANDOM(), and we shuffle
   each bucket again for safety).
   ───────────────────────────────────────────────────────────── */

function roundRobin(rows, limit) {
  // Group by artist, shuffle each bucket.
  const byArtist = new Map();
  for (const r of rows) {
    if (!byArtist.has(r.artist_id)) byArtist.set(r.artist_id, []);
    byArtist.get(r.artist_id).push(r);
  }
  for (const arr of byArtist.values()) shuffle(arr);

  const buckets = [...byArtist.values()];
  const out = [];

  // Interleave until we hit the limit or everyone runs dry.
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

  // A final shuffle so round-robin order isn't preserved in the
  // slot list the caller iterates (the caller's own selection logic
  // will pick whichever slots are eligible).
  return shuffle(out);
}