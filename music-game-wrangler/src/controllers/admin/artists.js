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
   Shared field list + serializer

   `instruments_count` = number of DISTINCT track_name in the
   instruments table for that artist.
   ═══════════════════════════════════════════════════════════ */

const ARTIST_FIELDS = `
  a.id, a.name, a.genre_ids, a.image, a.tracks_count,
  a.is_customized, a.source,
  (SELECT COUNT(DISTINCT i.track_name)
     FROM instruments i
    WHERE i.artist_id = a.id) AS instruments_count
`;

function serializeArtist(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    genre_ids: parseGenreIds(row.genre_ids),
    image: row.image ?? null,
    tracks_count: row.tracks_count ?? 0,
    is_customized: row.is_customized ?? 0,
    source: row.source ?? null,
    instruments_count: row.instruments_count ?? 0,
  };
}

/* ═══════════════════════════════════════════════════════════
   GET /artists
   Query: genre_id, search, source, limit, offset
   ═══════════════════════════════════════════════════════════ */

export async function listArtists(request, env) {
  const url = new URL(request.url);
  const genreId = url.searchParams.get('genre_id');
  const search  = (url.searchParams.get('search') ?? '').trim();
  const source  = url.searchParams.get('source');
  const limit   = clamp(Number(url.searchParams.get('limit') ?? 100), 1, 1000);
  const offset  = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const where = [];
  const binds = [];

  if (genreId) {
    where.push(
      'EXISTS (SELECT 1 FROM json_each(a.genre_ids) g WHERE CAST(g.value AS INTEGER) = ?)'
    );
    binds.push(Number(genreId));
  }
  if (search) {
    where.push('a.name LIKE ?');
    binds.push(`%${search}%`);
  }
  if (source && VALID_SOURCES.includes(source)) {
    where.push('a.source = ?');
    binds.push(source);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT ${ARTIST_FIELDS}
       FROM artists a
       ${whereSql}
       ORDER BY a.name ASC
       LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM artists a ${whereSql}`
  ).bind(...binds).first();

  return json({
    artists: (results ?? []).map(serializeArtist),
    count: results?.length ?? 0,
    total: countRow?.n ?? 0,
  });
}

/* ═══════════════════════════════════════════════════════════
   GET /artists/:id
   ═══════════════════════════════════════════════════════════ */

export async function getArtist(request, env, id) {
  const row = await env.DB.prepare(
    `SELECT ${ARTIST_FIELDS} FROM artists a WHERE a.id = ?`
  ).bind(Number(id)).first();

  if (!row) return error('Artist not found', 404);
  return json({ artist: serializeArtist(row) });
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
    `SELECT ${ARTIST_FIELDS} FROM artists a WHERE a.id = ?`
  ).bind(id).first();

  return json({ artist: serializeArtist(row) }, 201);
}

/* ═══════════════════════════════════════════════════════════
   PUT /artists/:id

   If `genre_ids` changes, cascade the new genre list into every
   instrument row for this artist. Each instrument's `genre_ids`
   becomes [6, ...newArtistGenres] (6 = the "Instrumental" genre).
   ═══════════════════════════════════════════════════════════ */

const INSTRUMENT_GENRE_ID = 6;

export async function updateArtist(request, env, id) {
  const artistId = Number(id);
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const existing = await env.DB.prepare(
    `SELECT id, source, genre_ids FROM artists WHERE id = ?`
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

  // ── Compare genre sets to decide whether to cascade ──
  const oldGenres = parseGenreIds(existing.genre_ids);
  const newGenres = Array.isArray(genreIds) ? genreIds : [];
  const genresChanged =
    JSON.stringify([...oldGenres].sort((a, b) => a - b)) !==
    JSON.stringify([...newGenres].sort((a, b) => a - b));

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

  // ── Cascade to instruments when genres actually changed ──
  let instrumentsUpdated = 0;
  if (genresChanged) {
    const instrumentGenres = JSON.stringify([INSTRUMENT_GENRE_ID, ...newGenres]);
    const res = await env.DB.prepare(
      `UPDATE instruments
          SET genre_ids = ?,
              updated_at = datetime('now')
        WHERE artist_id = ?`
    ).bind(instrumentGenres, artistId).run();
    instrumentsUpdated = res.meta?.changes ?? 0;
  }

  const row = await env.DB.prepare(
    `SELECT ${ARTIST_FIELDS} FROM artists a WHERE a.id = ?`
  ).bind(artistId).first();

  return json({
    artist: serializeArtist(row),
    instruments_updated: instrumentsUpdated,
  });
}

/* ═══════════════════════════════════════════════════════════
   DELETE /artists/:id
   ═══════════════════════════════════════════════════════════ */

export async function deleteArtist(request, env, id) {
  const artistId = Number(id);

  const existing = await env.DB.prepare(
    `SELECT id FROM artists WHERE id = ?`
  ).bind(artistId).first();
  if (!existing) return error('Artist not found', 404);

  // ── Cascade: R2 objects for this artist's instruments ──
  const { results: instrRows } = await env.DB.prepare(
    `SELECT id, r2_key FROM instruments WHERE artist_id = ?`
  ).bind(artistId).all();

  let r2Deleted = 0;
  for (const r of instrRows ?? []) {
    if (!r.r2_key) continue;
    try {
      await env.AUDIO.delete(r.r2_key);
      r2Deleted += 1;
    } catch (e) {
      console.warn('[deleteArtist] R2 delete failed:', r.r2_key, e.message);
    }
  }

  // ── Cascade: D1 rows ──
  await env.DB.prepare('DELETE FROM instruments WHERE artist_id = ?')
    .bind(artistId).run();

  // ── Finally, delete the artist ──
  await env.DB.prepare('DELETE FROM artists WHERE id = ?')
    .bind(artistId).run();

  return json({
    ok: true,
    id: artistId,
    instruments_deleted: instrRows?.length ?? 0,
    r2_deleted: r2Deleted,
  });
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
    `SELECT ${ARTIST_FIELDS} FROM artists a WHERE a.id = ?`
  ).bind(artistId).first();

  return json({ artist: serializeArtist(row) });
}

/**
 * PATCH /artists/:id/tracks_count
 * Body: { delta: 1 } or { delta: -1 }
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
    .prepare(`SELECT ${ARTIST_FIELDS} FROM artists a WHERE a.id = ?`)
    .bind(id)
    .first();

  return json({ artist: serializeArtist(row) });
}

/**
 * PATCH /artists/:id/tracks_count/set
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
    .prepare(`SELECT ${ARTIST_FIELDS} FROM artists a WHERE id = ?`)
    .bind(id)
    .first();

  return json({ artist: serializeArtist(row) });
}