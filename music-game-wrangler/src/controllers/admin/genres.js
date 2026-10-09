import { json, error, validationError } from '../../lib/response.js';
import { validateGenre } from '../../lib/validateGenre.js';

const FIELDS = 'id, name, display_name, image, is_customized';

function serialize(row) {
  return {
    id: row.id,
    name: row.name,
    display_name: row.display_name,
    image: row.image ?? null,
    is_customized: Boolean(row.is_customized),
  };
}

/** GET /genres */
export async function listGenres(request, env) {
  const { results } = await env.DB
    .prepare(`SELECT ${FIELDS} FROM genres ORDER BY id ASC`)
    .all();

  return json({
    genres: results.map(serialize),
    count: results.length,
  });
}

/** GET /genres/:id */
export async function getGenre(request, env, { id }) {
  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM genres WHERE id = ?`)
    .bind(id)
    .first();

  if (!row) return error(`Genre ${id} not found`, 404);
  return json({ genre: serialize(row) });
}

/** POST /genres */
export async function createGenre(request, env) {
  const body = await request.json().catch(() => null);
  const errors = validateGenre(body, { requireId: true });
  if (errors.length) return validationError(errors);

  const name = body.name.trim();
  const display_name = body.display_name.trim();
  const is_customized = body.is_customized ? 1 : 0;

  // Pre-check by name — gives a clean 409 error
  const byName = await env.DB
    .prepare('SELECT id FROM genres WHERE name = ?')
    .bind(name)
    .first();
  if (byName) {
    return error(`Genre with name "${name}" already exists (id: ${byName.id})`, 409);
  }

  try {
    await env.DB
      .prepare(
        `INSERT INTO genres (id, name, display_name, image, is_customized)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(body.id, name, display_name, body.image ?? null, is_customized)
      .run();
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return error(`Genre "${name}" or id ${body.id} already exists`, 409);
    }
    throw e;
  }

  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM genres WHERE id = ?`)
    .bind(body.id)
    .first();

  return json({ genre: serialize(row) }, { status: 201 });
}

/** PUT /genres/:id */
export async function updateGenre(request, env, { id }) {
  const body = await request.json().catch(() => null);
  const errors = validateGenre(body, { requireId: false });
  if (errors.length) return validationError(errors);

  const existing = await env.DB
    .prepare('SELECT id FROM genres WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Genre ${id} not found`, 404);

  const name = body.name.trim();
  const display_name = body.display_name.trim();

  // Reject rename that collides with another genre's name
  const byName = await env.DB
    .prepare('SELECT id FROM genres WHERE name = ? AND id != ?')
    .bind(name, id)
    .first();
  if (byName) {
    return error(`Genre with name "${name}" already exists (id: ${byName.id})`, 409);
  }

  await env.DB
    .prepare(
      `UPDATE genres
       SET name = ?, display_name = ?, image = ?
       WHERE id = ?`
    )
    .bind(name, display_name, body.image ?? null, id)
    .run();

  const row = await env.DB
    .prepare(`SELECT ${FIELDS} FROM genres WHERE id = ?`)
    .bind(id)
    .first();

  return json({ genre: serialize(row) });
}

/** DELETE /genres/:id */
export async function deleteGenre(request, env, { id }) {
  const existing = await env.DB
    .prepare('SELECT id FROM genres WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) return error(`Genre ${id} not found`, 404);

  await env.DB
    .prepare('DELETE FROM genres WHERE id = ?')
    .bind(id)
    .run();

  return json({ ok: true, deleted: id });
}