import { json, error } from '../../lib/response.js';
import { clamp } from '../../utilities/clamp.js';

/* ═══════════════════════════════════════════════════════════
   GET /lyrics  —  list with filters
   Query params:
     artist_id   (int, optional)
     search      (string, optional — matches track_name OR artist name)
     has_lyrics  (0|1, optional — filter by presence of lyrics text)
     limit       (int, default 100, max 500)
     offset      (int, default 0)
   ═══════════════════════════════════════════════════════════ */

export async function listLyrics(request, env) {
  const url = new URL(request.url);
  const artistId  = url.searchParams.get('artist_id');
  const search    = (url.searchParams.get('search') ?? '').trim();
  const hasLyrics = url.searchParams.get('has_lyrics');
  const limit = clamp(Number(url.searchParams.get('limit') ?? 100), 1, 2000);
  const offset    = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const where = [];
  const binds = [];

  if (artistId) {
    where.push('l.artist_id = ?');
    binds.push(Number(artistId));
  }
  if (search) {
    // Match against track_name OR the joined artist name.
    where.push('(l.track_name LIKE ? OR a.name LIKE ?)');
    const like = `%${search}%`;
    binds.push(like, like);
  }
  if (hasLyrics === '1') {
    where.push("l.lyrics IS NOT NULL AND l.lyrics != ''");
  } else if (hasLyrics === '0') {
    where.push("(l.lyrics IS NULL OR l.lyrics = '')");
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const { results } = await env.DB.prepare(
    `SELECT l.id,
            l.artist_id,
            a.name AS artist_name,
            l.track_name,
            CASE WHEN l.lyrics IS NULL OR l.lyrics = '' THEN NULL ELSE l.lyrics END AS lyrics,
            length(l.lyrics) AS char_count,
            l.created_at,
            l.updated_at
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     ${whereSql}
     ORDER BY l.artist_id ASC, l.track_name ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  // Total count for the same filter (for pagination)
  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     ${whereSql}`
  ).bind(...binds).first();

  return json({
    lyrics: results ?? [],
    count: results?.length ?? 0,
    total: totalRow?.n ?? 0,
    limit,
    offset,
  });
}

/* ═══════════════════════════════════════════════════════════
   GET /lyrics/:id  —  single by row id
   ═══════════════════════════════════════════════════════════ */

export async function getLyrics(request, env, id) {
  const row = await env.DB.prepare(
    `SELECT l.id,
            l.artist_id,
            a.name AS artist_name,
            l.track_name,
            l.lyrics,
            l.created_at,
            l.updated_at
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     WHERE l.id = ?`
  ).bind(Number(id)).first();

  if (!row) return error('Lyrics not found', 404);
  return json(row);
}

/* ═══════════════════════════════════════════════════════════
   GET /lyrics/by-track?artist_id=&track_name=
   —  single by composite key. Useful for the game client.
   ═══════════════════════════════════════════════════════════ */

export async function getLyricsByTrack(request, env) {
  const url = new URL(request.url);
  const artistId  = url.searchParams.get('artist_id');
  const trackName = url.searchParams.get('track_name');

  if (!artistId || !trackName) {
    return error('artist_id and track_name are required', 400);
  }

  const row = await env.DB.prepare(
    `SELECT l.id,
            l.artist_id,
            a.name AS artist_name,
            l.track_name,
            l.lyrics,
            l.created_at,
            l.updated_at
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     WHERE l.artist_id = ? AND l.track_name = ?`
  ).bind(Number(artistId), trackName).first();

  if (!row) return error('Lyrics not found for this track', 404);
  return json(row);
}

/* ═══════════════════════════════════════════════════════════
   POST /lyrics  —  create one
   Body: { artist_id, track_name, lyrics? }
   Returns 409 if (artist_id, track_name) already exists.
   ═══════════════════════════════════════════════════════════ */

export async function createLyrics(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const artistId  = Number(body?.artist_id);
  const trackName = String(body?.track_name ?? '').trim();
  const lyrics    = body?.lyrics == null ? null : String(body.lyrics);

  if (!Number.isInteger(artistId) || artistId <= 0) return error('artist_id must be a positive integer', 400);
  if (!trackName) return error('track_name is required', 400);

  const existing = await env.DB.prepare(
    `SELECT id FROM lyrics WHERE artist_id = ? AND track_name = ?`
  ).bind(artistId, trackName).first();
  if (existing) return error('Lyrics already exist for this track', 409);

  const res = await env.DB.prepare(
    `INSERT INTO lyrics (artist_id, track_name, lyrics)
     VALUES (?, ?, ?)`
  ).bind(artistId, trackName, lyrics).run();

  const id = res.meta?.last_row_id;

  // Re-fetch with the artist join so the response shape matches
  // GET /lyrics and GET /lyrics/:id
  const row = await env.DB.prepare(
    `SELECT l.id,
            l.artist_id,
            a.name AS artist_name,
            l.track_name,
            l.lyrics,
            l.created_at,
            l.updated_at
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     WHERE l.id = ?`
  ).bind(id).first();

  return json(row, 201);
}

/* ═══════════════════════════════════════════════════════════
   PUT /lyrics/:id  —  full update
   Body: { lyrics }
   ═══════════════════════════════════════════════════════════ */

export async function updateLyrics(request, env, id) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const lyrics = body?.lyrics == null ? null : String(body.lyrics);

  const existing = await env.DB.prepare(
    `SELECT id FROM lyrics WHERE id = ?`
  ).bind(Number(id)).first();
  if (!existing) return error('Lyrics not found', 404);

  await env.DB.prepare(
    `UPDATE lyrics
     SET lyrics = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(lyrics, Number(id)).run();

  const row = await env.DB.prepare(
    `SELECT l.id,
            l.artist_id,
            a.name AS artist_name,
            l.track_name,
            l.lyrics,
            l.created_at,
            l.updated_at
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     WHERE l.id = ?`
  ).bind(Number(id)).first();

  return json(row);
}

/* ═══════════════════════════════════════════════════════════
   DELETE /lyrics/:id
   ═══════════════════════════════════════════════════════════ */

export async function deleteLyrics(request, env, id) {
  const res = await env.DB.prepare(
    `DELETE FROM lyrics WHERE id = ?`
  ).bind(Number(id)).run();

  if ((res.meta?.changes ?? 0) === 0) return error('Lyrics not found', 404);
  return json({ ok: true, id: Number(id) });
}

/* ═══════════════════════════════════════════════════════════
   POST /lyrics/bulk  —  insert or update many
   Body: { items: [{ artist_id, track_name, lyrics }, ...] }
   Upsert semantics: if (artist_id, track_name) exists, update lyrics.
   Max 200 items per request.
   ═══════════════════════════════════════════════════════════ */

export async function bulkUpsertLyrics(request, env) {
  let body;
  try { body = await request.json(); } catch { return error('Invalid JSON body', 400); }

  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items) return error('items array is required', 400);
  if (items.length === 0) return json({ ok: true, inserted: 0, updated: 0, skipped: 0, errors: [] });
  if (items.length > 200) return error('Max 200 items per bulk request', 400);

  const errors = [];
  let inserted = 0, updated = 0, skipped = 0;

  const stmts = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const artistId  = Number(it?.artist_id);
    const trackName = String(it?.track_name ?? '').trim();
    const lyrics    = it?.lyrics == null ? null : String(it.lyrics);

    if (!Number.isInteger(artistId) || artistId <= 0 || !trackName) {
      errors.push({ index: i, reason: 'invalid artist_id or track_name', item: it });
      skipped++;
      continue;
    }

    stmts.push(
      env.DB.prepare(
        `INSERT INTO lyrics (artist_id, track_name, lyrics)
         VALUES (?, ?, ?)
         ON CONFLICT(artist_id, track_name)
         DO UPDATE SET lyrics = excluded.lyrics,
                       updated_at = datetime('now')`
      ).bind(artistId, trackName, lyrics)
    );
  }

  if (stmts.length > 0) {
    try {
      const results = await env.DB.batch(stmts);
      let ok = 0;
      for (const r of results) {
        if (r?.meta?.changes === 1) ok++;
      }
      inserted = ok;
      updated  = stmts.length - ok;
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
   GET /lyrics/stats  —  coverage stats
   Now includes artist_name in the per-artist breakdown.
   ═══════════════════════════════════════════════════════════ */

export async function lyricsStats(request, env) {
  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN lyrics IS NOT NULL AND lyrics != '' THEN 1 ELSE 0 END) AS with_lyrics,
       SUM(CASE WHEN lyrics IS NULL OR lyrics = '' THEN 1 ELSE 0 END) AS without_lyrics
     FROM lyrics`
  ).first();

  const perArtist = await env.DB.prepare(
    `SELECT l.artist_id,
            a.name AS artist_name,
            COUNT(*) AS total,
            SUM(CASE WHEN l.lyrics IS NOT NULL AND l.lyrics != '' THEN 1 ELSE 0 END) AS with_lyrics
     FROM lyrics l
     LEFT JOIN artists a ON a.id = l.artist_id
     GROUP BY l.artist_id, a.name
     ORDER BY l.artist_id ASC`
  ).all();

  return json({
    total: totals?.total ?? 0,
    withLyrics: totals?.with_lyrics ?? 0,
    withoutLyrics: totals?.without_lyrics ?? 0,
    perArtist: perArtist?.results ?? [],
  });
}