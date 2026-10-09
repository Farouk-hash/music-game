// music-game-wrangler/src/controllers/tracks.js
import { json, error, validationError } from '../../lib/response.js';
import { validateTrack } from '../../lib/validateTrack.js';
import { clamp } from '../../utilities/clamp.js';

const FIELDS =
  'id, name, artist_id, r2_key, r2_reversed_key, position, label, album_name, featured_artists';

function serialize(row) {
  return {
    id: row.id,
    name: row.name,
    artist_id: row.artist_id ?? null,
    r2_key: row.r2_key ?? null,
    r2_reversed_key: row.r2_reversed_key ?? null,
    position: row.position ?? null,
    label: row.label ?? null,
    album_name: row.album_name ?? null,
    featured_artists: row.featured_artists ?? null,
  };
}

/** GET /tracks?artist_id=...&position=...&search=...&has_reversed=0|1&album_name=...&has_featured=0|1 */
export async function listTracks(request, env) {
  const url = new URL(request.url);
  const artistIdParam = url.searchParams.get('artist_id');
  const positionParam = url.searchParams.get('position');
  const search = (url.searchParams.get('search') || '').trim();
  const albumName = (url.searchParams.get('album_name') || '').trim();
  const hasForward = url.searchParams.get('has_forward');
  const hasReversed = url.searchParams.get('has_reversed');
  const hasFeatured = url.searchParams.get('has_featured');

  const limit  = clamp(Number(url.searchParams.get('limit') ?? 100), 1, 20000);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const conditions = [];
  const bindings = [];

  if (artistIdParam) {
    const id = Number(artistIdParam);
    if (!Number.isInteger(id)) return error('artist_id must be an integer', 400);
    conditions.push('artist_id = ?');
    bindings.push(id);
  }

  if (positionParam) {
    const validPositions = ['start', 'middle', 'end', 'custom'];
    if (!validPositions.includes(positionParam)) {
      return error(`position must be one of: ${validPositions.join(', ')}`, 400);
    }
    conditions.push('position = ?');
    bindings.push(positionParam);
  }

  if (search) {
    conditions.push('name LIKE ?');
    bindings.push(`%${search}%`);
  }

  if (albumName) {
    conditions.push('album_name = ?');
    bindings.push(albumName);
  }

  if (hasForward === '1')  conditions.push('r2_key IS NOT NULL');
  if (hasForward === '0')  conditions.push('r2_key IS NULL');
  if (hasReversed === '1') conditions.push('r2_reversed_key IS NOT NULL');
  if (hasReversed === '0') conditions.push('r2_reversed_key IS NULL');
  if (hasFeatured === '1') conditions.push('featured_artists IS NOT NULL');
  if (hasFeatured === '0') conditions.push('featured_artists IS NULL');

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Paged result
  const stmt = env.DB.prepare(
    `SELECT ${FIELDS} FROM tracks ${where}
     ORDER BY artist_id, name, position
     LIMIT ? OFFSET ?`
  );
  const pagedBindings = [...bindings, limit, offset];
  const { results } = await stmt.bind(...pagedBindings).all();

  // Total for pagination
  const countStmt = env.DB.prepare(
    `SELECT COUNT(*) AS n FROM tracks ${where}`
  );
  const countRow = bindings.length
    ? await countStmt.bind(...bindings).first()
    : await countStmt.first();

  return json({
    tracks: results.map(serialize),
    count: results.length,
    total: countRow?.n ?? 0,
    limit,
    offset,
  });
}


/**
 * GET /tracks/artists-with-clips
 *
 * Returns every artist who has at least one slot with a forward clip.
 * Used by the admin to populate the artist filter dropdown without
 * loading the full track list.
 */
export async function artistsWithClips(request, env) {
  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim();

  const conditions = [
    `EXISTS (SELECT 1 FROM tracks t WHERE t.artist_id = a.id AND t.r2_key IS NOT NULL)`
  ];
  const bindings = [];

  if (search) {
    conditions.push('a.name LIKE ?');
    bindings.push(`%${search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const stmt = env.DB.prepare(
    `SELECT a.id, a.name FROM artists a ${where} ORDER BY a.name ASC`
  );
  const { results } = bindings.length
    ? await stmt.bind(...bindings).all()
    : await stmt.all();

  return json({
    artists: (results ?? []).map(r => ({ id: r.id, name: r.name })),
  });
}

/** GET /tracks/:id */
export async function getTrack(request, env, { id }) {
  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM tracks WHERE id = ?`)
    .bind(id)
    .first();

  if (!row) return error(`Track ${id} not found`, 404);
  return json({ track: serialize(row) });
}

/**
 * POST /tracks
 *
 * Two behaviors depending on whether the exact slot exists:
 *   1. Not found → INSERT a new row with album_name + featured_artists
 *   2. Found     → UPDATE album_name and featured_artists across
 *                  every (artist_id, name) row
 */
export async function createTrack(request, env) {
  const body = await request.json().catch(() => null);
  const errors = validateTrack(body);
  if (errors.length) return validationError(errors);

  const artistId = body.artist_id ?? null;
  const name     = body.name.trim();
  const position = body.position ?? null;

  // Look up the exact slot
  const existing = await env.DB
    .prepare(
      `SELECT id FROM tracks
       WHERE artist_id = ? AND name = ? AND position = ?`
    )
    .bind(artistId, name, position)
    .first();

  // ── Case 2: slot exists → tag album_name + featured_artists ──
  if (existing) {
    await env.DB
      .prepare(
        `UPDATE tracks
         SET album_name = ?,
             featured_artists = ?
         WHERE artist_id = ? AND name = ?`
      )
      .bind(
        body.album_name ?? null,
        body.featured_artists ?? null,
        artistId,
        name
      )
      .run();

    const row = await env.DB
      .prepare(`SELECT ${FIELDS} FROM tracks WHERE id = ?`)
      .bind(existing.id)
      .first();

    return json({ track: serialize(row), updated: true });
  }

  // ── Case 1: slot does not exist → insert a new row ──
  try {
    const result = await env.DB
      .prepare(
        `INSERT INTO tracks
           (name, artist_id, r2_key, r2_reversed_key, position, label,
            album_name, featured_artists)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        name,
        artistId,
        body.r2_key ?? null,
        body.r2_reversed_key ?? null,
        position,
        body.label ?? null,
        body.album_name ?? null,
        body.featured_artists ?? null
      )
      .run();

    const row = await env.DB
      .prepare(`SELECT ${FIELDS} FROM tracks WHERE id = ?`)
      .bind(result.meta.last_row_id)
      .first();

    return json({ track: serialize(row) }, { status: 201 });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return error(
        `A "${position}" slot already exists for "${name}" (artist ${artistId}). ` +
        `Use PUT to update.`,
        409
      );
    }
    throw e;
  }
}

/** PUT /tracks/:id */
export async function updateTrack(request, env, { id }) {
  const body = await request.json().catch(() => null);
  const errors = validateTrack(body);
  if (errors.length) return validationError(errors);

  const existing = await env.DB
    .prepare('SELECT id FROM tracks WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Track ${id} not found`, 404);

  try {
    await env.DB
      .prepare(
        `UPDATE tracks
         SET name = ?, artist_id = ?, r2_key = ?, r2_reversed_key = ?,
             position = ?, label = ?, album_name = ?, featured_artists = ?
         WHERE id = ?`
      )
      .bind(
        body.name.trim(),
        body.artist_id ?? null,
        body.r2_key ?? null,
        body.r2_reversed_key ?? null,
        body.position ?? null,
        body.label ?? null,
        body.album_name ?? null,
        body.featured_artists ?? null,
        id
      )
      .run();
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return error(
        `A "${body.position}" slot already exists for "${body.name}" (artist ${body.artist_id}).`,
        409
      );
    }
    throw e;
  }

  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM tracks WHERE id = ?`)
    .bind(id)
    .first();

  return json({ track: serialize(row) });
}

/** DELETE /tracks/:id */
export async function deleteTrack(request, env, { id }) {
  const existing = await env.DB
    .prepare('SELECT id, r2_key, r2_reversed_key FROM tracks WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Track ${id} not found`, 404);

  const keysToDelete = [existing.r2_key, existing.r2_reversed_key].filter(Boolean);
  for (const key of keysToDelete) {
    try { await env.AUDIO.delete(key); } catch (e) {
      console.warn('[deleteTrack] R2 delete failed for', key, e.message);
    }
  }

  await env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind(id).run();
  return json({ ok: true, deleted: id, deleted_keys: keysToDelete });
}

/** DELETE /tracks/:id/reversed */
export async function deleteReversedRendition(request, env, { id }) {
  const existing = await env.DB
    .prepare('SELECT id, r2_reversed_key FROM tracks WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Track ${id} not found`, 404);
  if (!existing.r2_reversed_key) {
    return error(`Track ${id} has no reversed rendition`, 404);
  }

  try {
    await env.AUDIO.delete(existing.r2_reversed_key);
  } catch (e) {
    console.warn('[deleteReversedRendition] R2 delete failed:', e.message);
  }

  await env.DB
    .prepare('UPDATE tracks SET r2_reversed_key = NULL WHERE id = ?')
    .bind(id)
    .run();

  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM tracks WHERE id = ?`)
    .bind(id)
    .first();

  return json({ ok: true, track: serialize(row) });
}