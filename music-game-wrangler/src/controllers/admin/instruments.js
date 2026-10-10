import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import { chunkedIn, D1_CHUNK_SIZE } from '../../utilities/chunkedIn.js';

const FIELDS =
  'id, artist_id, track_name, position, r2_key, album_name, ' +
  'genre_ids, created_at, updated_at';

const VALID_POSITIONS = ['middle', 'custom'];

function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    artist_id: row.artist_id,
    track_name: row.track_name,
    position: row.position,
    r2_key: row.r2_key,
    album_name: row.album_name ?? null,
    genre_ids: safeParseArray(row.genre_ids),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function safeParseArray(raw) {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/* ═══════════════════════════════════════════════════════════
   GET /instruments?artist_id=…&position=…&search=…&limit=&offset=
   ═══════════════════════════════════════════════════════════ */
export async function listInstruments(request, env) {
  const url = new URL(request.url);
  const artistIdParam = url.searchParams.get('artist_id');
  const positionParam = url.searchParams.get('position');
  const search = (url.searchParams.get('search') ?? '').trim();

  const limit  = clamp(Number(url.searchParams.get('limit') ?? 100), 1, 20000);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const conditions = [];
  const binds = [];

  if (artistIdParam) {
    const id = Number(artistIdParam);
    if (!Number.isInteger(id)) return error('artist_id must be an integer', 400);
    conditions.push('artist_id = ?');
    binds.push(id);
  }

  if (positionParam) {
    if (!VALID_POSITIONS.includes(positionParam)) {
      return error(`position must be one of: ${VALID_POSITIONS.join(', ')}`, 400);
    }
    conditions.push('position = ?');
    binds.push(positionParam);
  }

  if (search) {
    conditions.push('track_name LIKE ?');
    binds.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT ${FIELDS} FROM instruments ${where}
     ORDER BY artist_id, track_name, position
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  const countRow = binds.length
    ? await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM instruments ${where}`
      ).bind(...binds).first()
    : await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM instruments`
      ).first();

  return json({
    instruments: (results ?? []).map(serialize),
    count: results?.length ?? 0,
    total: countRow?.n ?? 0,
    limit,
    offset,
  });
}

/* ═══════════════════════════════════════════════════════════
   POST /instruments/bulk
   Body: { items: [{ artist_id, track_name, position, r2_key,
                     album_name, genre_ids}] }
   Upserts on (artist_id, track_name, position).
   ═══════════════════════════════════════════════════════════ */
export async function bulkUpsertInstruments(request, env) {
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || items.length === 0) {
    return error('items must be a non-empty array', 400);
  }
  if (items.length > 500) {
    return error('maximum 500 items per call', 400);
  }

  let statements;
  try {
    statements = items.map((it) => {
      if (!Number.isInteger(it.artist_id)) {
        throw new Error('each item needs an integer artist_id');
      }
      if (!it.track_name || typeof it.track_name !== 'string') {
        throw new Error('each item needs a track_name');
      }
      if (!VALID_POSITIONS.includes(it.position)) {
        throw new Error(`position must be one of: ${VALID_POSITIONS.join(', ')}`);
      }
      if (!it.r2_key || typeof it.r2_key !== 'string') {
        throw new Error('each item needs an r2_key');
      }

      const genreIds = Array.isArray(it.genre_ids) ? it.genre_ids : [];

      return env.DB.prepare(
        `INSERT INTO instruments
           (artist_id, track_name, position, r2_key, album_name,
            genre_ids)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(artist_id, track_name, position) DO UPDATE SET
           r2_key      = excluded.r2_key,
           album_name  = excluded.album_name,
           genre_ids   = excluded.genre_ids,
           updated_at  = datetime('now')`
      ).bind(
        it.artist_id,
        it.track_name,
        it.position,
        it.r2_key,
        it.album_name ?? null,
        JSON.stringify(genreIds)
      );
    });
  } catch (e) {
    return error(e.message, 400);
  }

  const results = await env.DB.batch(statements);

  return json({
    ok: true,
    inserted: results.length,
  });
}

/* ═══════════════════════════════════════════════════════════
   DELETE /instruments/:id
   ═══════════════════════════════════════════════════════════ */
export async function deleteInstrument(request, env, { id }) {
  const row = await env.DB.prepare(
    `SELECT id, r2_key FROM instruments WHERE id = ?`
  ).bind(id).first();

  if (!row) return error(`Instrument ${id} not found`, 404);

  if (row.r2_key) {
    try { await env.AUDIO.delete(row.r2_key); }
    catch (e) { console.warn('[deleteInstrument] R2 delete failed:', e.message); }
  }

  await env.DB.prepare('DELETE FROM instruments WHERE id = ?').bind(id).run();
  return json({ ok: true, deleted: id });
}

/* ═══════════════════════════════════════════════════════════
   DELETE /instruments/artist/:artistId
   Cascades D1 + R2 for one artist's instruments.
   ═══════════════════════════════════════════════════════════ */
export async function deleteInstrumentsByArtist(request, env, { artistId }) {
  const { results } = await env.DB.prepare(
    `SELECT id, r2_key FROM instruments WHERE artist_id = ?`
  ).bind(artistId).all();

  const rows = results ?? [];
  if (rows.length === 0) {
    return json({ ok: true, deleted: 0, r2_deleted: 0 });
  }

  let r2Deleted = 0;
  for (const r of rows) {
    if (!r.r2_key) continue;
    try { await env.AUDIO.delete(r.r2_key); r2Deleted += 1; }
    catch (e) { console.warn('[deleteInstrumentsByArtist] R2 delete failed:', e.message); }
  }

  await env.DB.prepare(
    `DELETE FROM instruments WHERE artist_id = ?`
  ).bind(artistId).run();

  return json({ ok: true, deleted: rows.length, r2_deleted: r2Deleted });
}

/* ═══════════════════════════════════════════════════════════
   POST /instruments/check-duplicates
   Body: { artist_ids: [1,2,3] }
   Returns: { duplicates: ["track name 1", "track name 2"] }
   Names that appear in more than one selected artist.
   ═══════════════════════════════════════════════════════════ */
export async function checkDuplicateNames(request, env) {
  const body = await request.json().catch(() => null);
  const artistIds = Array.isArray(body?.artist_ids) ? body.artist_ids : null;
  if (!artistIds || artistIds.length === 0) {
    return error('artist_ids must be a non-empty array', 400);
  }

  const ids = artistIds.map(Number).filter(Number.isInteger);
  if (ids.length === 0) return error('no valid artist_ids', 400);

  const rows = await chunkedIn(ids, D1_CHUNK_SIZE, async (chunk) => {
    const ph = chunk.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT track_name, COUNT(DISTINCT artist_id) AS n
         FROM instruments
        WHERE artist_id IN (${ph})
        GROUP BY track_name
       HAVING n > 1`
    ).bind(...chunk).all();
    return results ?? [];
  });

  const names = [...new Set(rows.map(r => r.track_name).filter(Boolean))];

  return json({ duplicates: names });
}