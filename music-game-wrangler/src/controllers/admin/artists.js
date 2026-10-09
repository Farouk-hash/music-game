// music-game-wrangler/src/controllers/artists.js
import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';
import {
  VALID_SOURCES,
  sanitizeSource,
  serializeGenreIds,
  validateArtist,
  parseGenreIds, 
} from '../../lib/validateArtist.js';

/* ═══════════════════════════════════════════════════════════
   GET /artists
   Query: genre_id, search, source, limit, offset
   ═══════════════════════════════════════════════════════════ */

export async function listArtists(request, env) {
  const url = new URL(request.url);
  const genreId = url.searchParams.get('genre_id');
  const search  = (url.searchParams.get('search') ?? '').trim();
  const source  = url.searchParams.get('source');
const limit = clamp(Number(url.searchParams.get('limit') ?? 100), 1, 1000);
  const offset  = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const where = [];
  const binds = [];

  if (genreId) {
    where.push(
      'EXISTS (SELECT 1 FROM json_each(artists.genre_ids) g WHERE CAST(g.value AS INTEGER) = ?)'
    );
    binds.push(Number(genreId));
  }
  if (search) {
    where.push('name LIKE ?');
    binds.push(`%${search}%`);
  }
  if (source && VALID_SOURCES.includes(source)) {
    where.push('source = ?');
    binds.push(source);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT id, name, genre_ids, image, tracks_count, is_customized,
            source
     FROM artists
     ${whereSql}
     ORDER BY name ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM artists ${whereSql}`
  ).bind(...binds).first();

  return json({
    artists: (results ?? []).map(row => ({
      ...row,
      genre_ids: parseGenreIds(row.genre_ids),
    })),
    count: results?.length ?? 0,
    total: countRow?.n ?? 0,
  });
}

/* ═══════════════════════════════════════════════════════════
   GET /artists/:id
   ═══════════════════════════════════════════════════════════ */

export async function getArtist(request, env, id) {
  const row = await env.DB.prepare(
    `SELECT id, name, genre_ids, image, tracks_count, is_customized,
            source
     FROM artists WHERE id = ?`
  ).bind(Number(id)).first();

  if (!row) return error('Artist not found', 404);
  return json({
    artist: { ...row, genre_ids: parseGenreIds(row.genre_ids) },
  });
}

/* ═══════════════════════════════════════════════════════════
   POST /artists
   ═══════════════════════════════════════════════════════════ */

export async function createArtist(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const errors = validateArtist(body, { requireId: true });
  if (errors.length > 0) return error(errors.join('; '), 400);

  const id           = Number(body.id);
  const name         = String(body.name).trim();
  const genreIds     = body.genre_ids;
  const image        = body.image ?? null;
  const tracksCount  = Number.isInteger(body.tracks_count) ? body.tracks_count : 0;
  const isCustomized = body.is_customized ? 1 : 0;
  const source       = sanitizeSource(body.source);

  const existing = await env.DB.prepare(
    `SELECT id FROM artists WHERE id = ?`
  ).bind(id).first();

  if (existing) {
    return error('Artist already exists', 409);
  }

  await env.DB.prepare(
    `INSERT INTO artists
      (id, name, genre_ids, image, tracks_count, is_customized, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    name,
    serializeGenreIds(genreIds),
    image,
    tracksCount,
    isCustomized,
    source
  ).run();

  const row = await env.DB.prepare(
    `SELECT id, name, genre_ids, image, tracks_count, is_customized,
            source
     FROM artists WHERE id = ?`
  ).bind(id).first();

  return json({
    artist: { ...row, genre_ids: parseGenreIds(row.genre_ids) },
  }, 201);
}

/* ═══════════════════════════════════════════════════════════
   PUT /artists/:id
   ═══════════════════════════════════════════════════════════ */

export async function updateArtist(request, env, id) {
  const artistId = Number(id);
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const existing = await env.DB.prepare(
    `SELECT id, source FROM artists WHERE id = ?`
  ).bind(artistId).first();
  if (!existing) return error('Artist not found', 404);

  const errors = validateArtist(body, { requireId: false });
  if (errors.length > 0) return error(errors.join('; '), 400);

  const name     = String(body.name).trim();
  const genreIds = body.genre_ids;
  const image    = body.image ?? null;

  // Source is fixed after creation. Accept the incoming value only if
  // it's valid; otherwise preserve the existing one.
  const nextSource = body.source && VALID_SOURCES.includes(body.source)
    ? body.source
    : existing.source;

  await env.DB.prepare(
    `UPDATE artists
     SET name = ?, genre_ids = ?, image = ?, source = ?
     WHERE id = ?`
  ).bind(
    name,
    serializeGenreIds(genreIds),
    image,
    nextSource,
    artistId
  ).run();

  const row = await env.DB.prepare(
    `SELECT id, name, genre_ids, image, tracks_count, is_customized,
            source
     FROM artists WHERE id = ?`
  ).bind(artistId).first();

  return json({
    artist: { ...row, genre_ids: parseGenreIds(row.genre_ids) },
  });
}

/* ═══════════════════════════════════════════════════════════
   DELETE /artists/:id
   ═══════════════════════════════════════════════════════════ */

export async function deleteArtist(request, env, id) {
  const artistId = Number(id);
  const res = await env.DB.prepare(
    `DELETE FROM artists WHERE id = ?`
  ).bind(artistId).run();

  if ((res.meta?.changes ?? 0) === 0) return error('Artist not found', 404);
  return json({ ok: true, id: artistId });
}

/* ═══════════════════════════════════════════════════════════
   PATCH /artists/:id/tracks_count
   ═══════════════════════════════════════════════════════════ */

export async function patchTracksCount(request, env, id) {
  const artistId = Number(id);
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const delta = Number(body?.delta);
  if (!Number.isInteger(delta)) return error('delta must be an integer', 400);

  const existing = await env.DB.prepare(
    `SELECT id FROM artists WHERE id = ?`
  ).bind(artistId).first();
  if (!existing) return error('Artist not found', 404);

  await env.DB.prepare(
    `UPDATE artists
     SET tracks_count = MAX(0, tracks_count + ?)
     WHERE id = ?`
  ).bind(delta, artistId).run();

  const row = await env.DB.prepare(
    `SELECT id, name, genre_ids, image, tracks_count, is_customized,
            source
     FROM artists WHERE id = ?`
  ).bind(artistId).first();

  return json({
    artist: { ...row, genre_ids: parseGenreIds(row.genre_ids) },
  });
}

/**
 * PATCH /artists/:id/tracks_count
 * Body: { delta: 1 } or { delta: -1 }
 * Clamps to 0 — the count never goes negative.
 */
export async function adjustArtistTracksCount(request, env, { id }) {
  const body = await request.json().catch(() => null);
  const delta = Number(body?.delta);

  if (!Number.isInteger(delta) || delta === 0) {
    return error('delta must be a non-zero integer', 400);
  }

  const existing = await env.DB
    .prepare('SELECT id FROM artists WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Artist ${id} not found`, 404);

  await env.DB
    .prepare(
      `UPDATE artists
       SET tracks_count = MAX(0, tracks_count + ?)
       WHERE id = ?`
    )
    .bind(delta, id)
    .run();

  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM artists WHERE id = ?`)
    .bind(id)
    .first();

  return json({ artist: serialize(row) });
}

/**
 * PATCH /artists/:id/tracks_count/set
 * Set the count to an explicit value (used for full resyncs).
 * Body: { count: 12 }
 */
export async function setArtistTracksCount(request, env, { id }) {
  const body = await request.json().catch(() => null);
  const count = Number(body?.count);

  if (!Number.isInteger(count) || count < 0) {
    return error('count must be a non-negative integer', 400);
  }

  const existing = await env.DB
    .prepare('SELECT id FROM artists WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Artist ${id} not found`, 404);

  await env.DB
    .prepare(
      `UPDATE artists
       SET tracks_count = ?
       WHERE id = ?`
    )
    .bind(count, id)
    .run();

  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM artists WHERE id = ?`)
    .bind(id)
    .first();

  return json({ artist: serialize(row) });
}