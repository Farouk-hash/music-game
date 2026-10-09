import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';

/* ═══════════════════════════════════════════════════════════
   GET /album-years  —  list with filters
   Query params:
     artist_id   (int, optional)
     year        (int, optional — exact match)
     search      (string, optional — matches album_name OR artist name)
     has_year    (0|1, optional — always 1 given NOT NULL, kept for parity)
     limit       (int, default 200, max 2000)
     offset      (int, default 0)
   ═══════════════════════════════════════════════════════════ */

export async function listAlbumYears(request, env) {
  const url = new URL(request.url);
  const artistId = url.searchParams.get('artist_id');
  const year     = url.searchParams.get('year');
  const search   = (url.searchParams.get('search') ?? '').trim();
  const limit  = clamp(Number(url.searchParams.get('limit') ?? 200), 1, 2000);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const where = [];
  const binds = [];

  if (artistId) {
    where.push('ay.artist_id = ?');
    binds.push(Number(artistId));
  }
  if (year) {
    where.push('ay.released_year = ?');
    binds.push(Number(year));
  }
  if (search) {
    where.push('(ay.album_name LIKE ? OR a.name LIKE ?)');
    const like = `%${search}%`;
    binds.push(like, like);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT ay.id,
            ay.artist_id,
            a.name AS artist_name,
            ay.album_name,
            ay.released_year,
            ay.created_at,
            ay.updated_at
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     ${whereSql}
     ORDER BY ay.artist_id ASC, ay.released_year ASC, ay.album_name ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     ${whereSql}`
  ).bind(...binds).first();

  return json({
    albumYears: results ?? [],
    count: results?.length ?? 0,
    total: totalRow?.n ?? 0,
    limit,
    offset,
  });
}

/* ═══════════════════════════════════════════════════════════
   GET /album-years/:id
   ═══════════════════════════════════════════════════════════ */

export async function getAlbumYear(request, env, id) {
  const row = await env.DB.prepare(
    `SELECT ay.id,
            ay.artist_id,
            a.name AS artist_name,
            ay.album_name,
            ay.released_year,
            ay.created_at,
            ay.updated_at
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     WHERE ay.id = ?`
  ).bind(Number(id)).first();

  if (!row) return error('Album year not found', 404);
  return json(row);
}

/* ═══════════════════════════════════════════════════════════
   GET /album-years/by-artist?artist_id=
   — all rows for one artist, keyed by album_name.
   Used by the game client to join against tracks.
   ═══════════════════════════════════════════════════════════ */

export async function getAlbumYearsByArtist(request, env) {
  const url = new URL(request.url);
  const artistId = url.searchParams.get('artist_id');

  if (!artistId) return error('artist_id is required', 400);

  const { results } = await env.DB.prepare(
    `SELECT ay.id,
            ay.artist_id,
            a.name AS artist_name,
            ay.album_name,
            ay.released_year,
            ay.created_at,
            ay.updated_at
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     WHERE ay.artist_id = ?
     ORDER BY ay.released_year ASC, ay.album_name ASC`
  ).bind(Number(artistId)).all();

  return json({
    artist_id: Number(artistId),
    albumYears: results ?? [],
    count: results?.length ?? 0,
  });
}

/* ═══════════════════════════════════════════════════════════
   POST /album-years  —  create one
   Body: { artist_id, album_name, released_year }
   409 if (artist_id, album_name) exists.
   ═══════════════════════════════════════════════════════════ */

export async function createAlbumYear(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const artistId = Number(body?.artist_id);
  const albumName = String(body?.album_name ?? '').trim();
  const releasedYear = Number(body?.released_year);

  if (!Number.isInteger(artistId) || artistId <= 0) {
    return error('artist_id must be a positive integer', 400);
  }
  if (!albumName) return error('album_name is required', 400);
  if (!Number.isInteger(releasedYear) || releasedYear < 1900 || releasedYear > 2100) {
    return error('released_year must be an integer between 1900 and 2100', 400);
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM album_years WHERE artist_id = ? AND album_name = ?`
  ).bind(artistId, albumName).first();
  if (existing) return error('Album year already exists for this artist/album', 409);

  const res = await env.DB.prepare(
    `INSERT INTO album_years (artist_id, album_name, released_year)
     VALUES (?, ?, ?)`
  ).bind(artistId, albumName, releasedYear).run();

  const id = res.meta?.last_row_id;

  const row = await env.DB.prepare(
    `SELECT ay.id,
            ay.artist_id,
            a.name AS artist_name,
            ay.album_name,
            ay.released_year,
            ay.created_at,
            ay.updated_at
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     WHERE ay.id = ?`
  ).bind(id).first();

  return json(row, 201);
}

/* ═══════════════════════════════════════════════════════════
   PUT /album-years/:id  —  update
   Body: { album_name?, released_year? }
   ═══════════════════════════════════════════════════════════ */

export async function updateAlbumYear(request, env, id) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const existing = await env.DB.prepare(
    `SELECT id, artist_id, album_name, released_year FROM album_years WHERE id = ?`
  ).bind(Number(id)).first();
  if (!existing) return error('Album year not found', 404);

  const nextAlbumName = body?.album_name != null
    ? String(body.album_name).trim()
    : existing.album_name;
  const nextYear = body?.released_year != null
    ? Number(body.released_year)
    : existing.released_year;

  if (!nextAlbumName) return error('album_name cannot be empty', 400);
  if (!Number.isInteger(nextYear) || nextYear < 1900 || nextYear > 2100) {
    return error('released_year must be an integer between 1900 and 2100', 400);
  }

  // If the album_name changes, guard the unique constraint explicitly
  // so we return 409 instead of a raw SQL error.
  if (nextAlbumName !== existing.album_name) {
    const clash = await env.DB.prepare(
      `SELECT id FROM album_years WHERE artist_id = ? AND album_name = ? AND id != ?`
    ).bind(existing.artist_id, nextAlbumName, existing.id).first();
    if (clash) return error('Another album with this name already exists for this artist', 409);
  }

  await env.DB.prepare(
    `UPDATE album_years
     SET album_name = ?, released_year = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(nextAlbumName, nextYear, Number(id)).run();

  const row = await env.DB.prepare(
    `SELECT ay.id,
            ay.artist_id,
            a.name AS artist_name,
            ay.album_name,
            ay.released_year,
            ay.created_at,
            ay.updated_at
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     WHERE ay.id = ?`
  ).bind(Number(id)).first();

  return json(row);
}

/* ═══════════════════════════════════════════════════════════
   DELETE /album-years/:id
   ═══════════════════════════════════════════════════════════ */

export async function deleteAlbumYear(request, env, id) {
  const res = await env.DB.prepare(
    `DELETE FROM album_years WHERE id = ?`
  ).bind(Number(id)).run();

  if ((res.meta?.changes ?? 0) === 0) return error('Album year not found', 404);
  return json({ ok: true, id: Number(id) });
}

/* ═══════════════════════════════════════════════════════════
   POST /album-years/bulk  —  upsert many
   Body: { items: [{ artist_id, album_name, released_year }, ...] }
   Upsert on (artist_id, album_name). Max 200 per request.
   ═══════════════════════════════════════════════════════════ */

export async function bulkUpsertAlbumYears(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items) return error('items array is required', 400);
  if (items.length === 0) return json({ ok: true, inserted: 0, updated: 0, skipped: 0, errors: [] });
  if (items.length > 200) return error('Max 200 items per bulk request', 400);

  const errors = [];
  let skipped = 0;

  const stmts = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const artistId = Number(it?.artist_id);
    const albumName = String(it?.album_name ?? '').trim();
    const releasedYear = Number(it?.released_year);

    if (!Number.isInteger(artistId) || artistId <= 0 || !albumName ||
        !Number.isInteger(releasedYear) || releasedYear < 1900 || releasedYear > 2100) {
      errors.push({ index: i, reason: 'invalid artist_id, album_name, or released_year', item: it });
      skipped++;
      continue;
    }

    stmts.push(
      env.DB.prepare(
        `INSERT INTO album_years (artist_id, album_name, released_year)
         VALUES (?, ?, ?)
         ON CONFLICT(artist_id, album_name)
         DO UPDATE SET released_year = excluded.released_year,
                       updated_at = datetime('now')`
      ).bind(artistId, albumName, releasedYear)
    );
  }

  let inserted = 0, updated = 0;
  if (stmts.length > 0) {
    try {
      const results = await env.DB.batch(stmts);
      let ok = 0;
      for (const r of results) {
        if (r?.meta?.changes === 1) ok++;
      }
      inserted = ok;
      updated = stmts.length - ok;
    } catch (err) {
      return error(`Bulk upsert failed: ${err.message}`, 500);
    }
  }

  return json({
    ok: true,
    received: items.length,
    processed: stmts.length,
    inserted,
    updated,
    skipped,
    errors,
  });
}

/* ═══════════════════════════════════════════════════════════
   GET /album-years/stats  —  coverage stats
   ═══════════════════════════════════════════════════════════ */

export async function albumYearsStats(request, env) {
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
            COUNT(DISTINCT artist_id) AS artists
     FROM album_years`
  ).first();

  const perArtist = await env.DB.prepare(
    `SELECT ay.artist_id,
            a.name AS artist_name,
            COUNT(*) AS total,
            MIN(ay.released_year) AS earliest,
            MAX(ay.released_year) AS latest
     FROM album_years ay
     LEFT JOIN artists a ON a.id = ay.artist_id
     GROUP BY ay.artist_id, a.name
     ORDER BY ay.artist_id ASC`
  ).all();

  return json({
    total: totals?.total ?? 0,
    artists: totals?.artists ?? 0,
    perArtist: perArtist?.results ?? [],
  });
}