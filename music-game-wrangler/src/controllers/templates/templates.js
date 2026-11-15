// music-game-wrangler/src/controllers/templates/templates.js
import { json, error } from '../../lib/response.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import {
  validateTemplateName,
  validateDescription,
  validateSortOrder,
  validateLevels,
  validateYears,
  validateGenresIds,
  validateArtistsIds,
  validateRounds,
} from '../../utilities/templates/validate.js';
import { chunkedIn } from '../../utilities/chunkedIn.js';
import { buildReplaceRoundsStatements } from '../collections/rounds.js';

const TEMPLATE_FIELDS =
  'id, name, description, sort_order, is_public, cover_kind, cover_r2_key, levels, years, genres_ids, artists_ids, created_at, updated_at';

const ROUND_FIELDS =
  'template_id, position, level, question_types, answer_mode, mode, rounds, reversed_answers, reversed_audio, instruments, timer';

function parseJSON(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function serializeTemplateRound(row) {
  return {
    position:        row.position,
    level:           row.level,
    questionTypes:   parseJSON(row.question_types, []),
    answerMode:      row.answer_mode,
    mode:            row.mode,
    rounds:          row.rounds,
    reversedAnswers: row.reversed_answers,
    reversedAudio:   Boolean(row.reversed_audio),
    instruments:     row.instruments,
    timer:           row.timer ?? null,
  };
}

export function serializeTemplate(row, rounds) {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? null,
    sortOrder:   row.sort_order,
    isPublic:    Boolean(row.is_public),
    levels:      parseJSON(row.levels, []),
    years:       parseJSON(row.years, null),
    genresIds:   parseJSON(row.genres_ids, []),
    artistsIds:  parseJSON(row.artists_ids, []),
    cover: {
      kind: row.cover_kind,
      url:  row.cover_r2_key ? `/templates/${row.id}/cover` : null,
    },
    rounds: rounds.map(serializeTemplateRound),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchTemplateRounds(env, templateIds) {
  if (templateIds.length === 0) return new Map();

  const rows = await chunkedIn(templateIds, 90, async (chunk) => {
    const ph = chunk.map(() => '?').join(',');
    const res = await env.DB.prepare(
      `SELECT ${ROUND_FIELDS} FROM template_rounds WHERE template_id IN (${ph}) ORDER BY template_id, position ASC`
    ).bind(...chunk).all();
    return res.results ?? [];
  });

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.template_id)) map.set(r.template_id, []);
    map.get(r.template_id).push(r);
  }
  return map;
}

export async function buildTemplateResponse(env, templateId) {
  const row = await env.DB.prepare(
    `SELECT ${TEMPLATE_FIELDS} FROM templates WHERE id = ?`
  ).bind(templateId).first();
  if (!row) return null;

  const roundsMap = await fetchTemplateRounds(env, [templateId]);
  return serializeTemplate(row, roundsMap.get(templateId) ?? []);
}

/* ─────────────────────────────────────────────────────────────
   POST /templates?admin_key=…
   Body: { name, description?, sortOrder?, isPublic?, levels,
           years?, genresIds?, artistsIds?, rounds }
   ───────────────────────────────────────────────────────────── */
export async function createTemplate(request, env) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid JSON body', 400);

  const nameV  = validateTemplateName(body.name);
  if (!nameV.ok) return error(nameV.error, 400);

  const descV  = validateDescription(body.description ?? null);
  if (!descV.ok) return error(descV.error, 400);

  const sortV  = validateSortOrder(body.sortOrder ?? body.sort_order ?? 0);
  if (!sortV.ok) return error(sortV.error, 400);

  const levelsV = validateLevels(body.levels);
  if (!levelsV.ok) return error(levelsV.error, 400);

  const yearsV  = validateYears(body.years ?? null);
  if (!yearsV.ok) return error(yearsV.error, 400);

  const genresV = validateGenresIds(body.genresIds ?? []);
  if (!genresV.ok) return error(genresV.error, 400);

  const artistsV = validateArtistsIds(body.artistsIds ?? []);
  if (!artistsV.ok) return error(artistsV.error, 400);

  const roundsV = validateRounds(body.rounds ?? [], levelsV.value);
  if (!roundsV.ok) return error(roundsV.error, 400);

  const isPublicFlag = body.isPublic ? 1 : 0;

  const insert = await env.DB.prepare(
    `INSERT INTO templates (name, description, sort_order, is_public, levels, years, genres_ids, artists_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    nameV.value,
    descV.value,
    sortV.value,
    isPublicFlag,
    JSON.stringify(levelsV.value),
    yearsV.value == null ? null : JSON.stringify(yearsV.value),
    JSON.stringify(genresV.value),
    JSON.stringify(artistsV.value),
  ).run();

  const newId = insert.meta.last_row_id;

  const roundStatements = buildReplaceRoundsStatements(
    env, newId, roundsV.value, 'template_id', 'template_rounds'
  );
  if (roundStatements.length > 1) {
    await env.DB.batch(roundStatements);
  }

  const template = await buildTemplateResponse(env, newId);
  return json({ template });
}

/* ─────────────────────────────────────────────────────────────
   GET /templates                 → all (admin view)
   GET /templates?public=1        → only is_public = 1 (client view)
   ───────────────────────────────────────────────────────────── */
export async function listTemplates(request, env) {
  const url = new URL(request.url);
  const publicOnly = url.searchParams.get('public') === '1';

  const sql = publicOnly
    ? `SELECT ${TEMPLATE_FIELDS} FROM templates WHERE is_public = 1 ORDER BY sort_order ASC, created_at DESC`
    : `SELECT ${TEMPLATE_FIELDS} FROM templates ORDER BY sort_order ASC, created_at DESC`;

  const { results } = await env.DB.prepare(sql).all();
  const rows = results ?? [];
  const roundsMap = await fetchTemplateRounds(env, rows.map(r => r.id));

  return json({
    templates: rows.map(r => serializeTemplate(r, roundsMap.get(r.id) ?? [])),
    total: rows.length,
  });
}

/* ─────────────────────────────────────────────────────────────
   GET /templates/:id
   ───────────────────────────────────────────────────────────── */
export async function getTemplate(request, env, { id }) {
  const template = await buildTemplateResponse(env, Number(id));
  if (!template) return error('Template not found', 404);
  return json({ template });
}

/* ─────────────────────────────────────────────────────────────
   PUT /templates/:id?admin_key=…
   All fields optional (partial update).
   ───────────────────────────────────────────────────────────── */
export async function saveTemplate(request, env, { id }) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const templateId = Number(id);
  const existing = await env.DB.prepare(
    'SELECT id, levels FROM templates WHERE id = ?'
  ).bind(templateId).first();
  if (!existing) return error('Template not found', 404);

  const body = await request.json().catch(() => null);
  if (!body) return error('Invalid JSON body', 400);

  const updates = [];
  const binds = [];
  const statements = [];
  let validatedLevels = null;

  if (body.name !== undefined) {
    const v = validateTemplateName(body.name);
    if (!v.ok) return error(v.error, 400);
    updates.push('name = ?'); binds.push(v.value);
  }
  if (body.description !== undefined) {
    const v = validateDescription(body.description);
    if (!v.ok) return error(v.error, 400);
    updates.push('description = ?'); binds.push(v.value);
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    const v = validateSortOrder(body.sortOrder ?? body.sort_order);
    if (!v.ok) return error(v.error, 400);
    updates.push('sort_order = ?'); binds.push(v.value);
  }
  if (body.levels !== undefined) {
    const v = validateLevels(body.levels);
    if (!v.ok) return error(v.error, 400);
    validatedLevels = v.value;
    updates.push('levels = ?'); binds.push(JSON.stringify(v.value));
  }
  if (body.years !== undefined) {
    const v = validateYears(body.years);
    if (!v.ok) return error(v.error, 400);
    updates.push('years = ?'); binds.push(v.value == null ? null : JSON.stringify(v.value));
  }
  if (body.genresIds !== undefined) {
    const v = validateGenresIds(body.genresIds);
    if (!v.ok) return error(v.error, 400);
    updates.push('genres_ids = ?'); binds.push(JSON.stringify(v.value));
  }
  if (body.artistsIds !== undefined) {
    const v = validateArtistsIds(body.artistsIds);
    if (!v.ok) return error(v.error, 400);
    updates.push('artists_ids = ?'); binds.push(JSON.stringify(v.value));
  }
  if (body.isPublic !== undefined) {
    updates.push('is_public = ?'); binds.push(body.isPublic ? 1 : 0);
  }

  const levelsForValidation = validatedLevels !== null
    ? validatedLevels
    : parseJSON(existing.levels, []);

  if (body.rounds !== undefined) {
    const v = validateRounds(body.rounds, levelsForValidation);
    if (!v.ok) return error(v.error, 400);
    statements.push(...buildReplaceRoundsStatements(
      env, templateId, v.value, 'template_id', 'template_rounds'
    ));
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    statements.unshift(
      env.DB.prepare(
        `UPDATE templates SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...binds, templateId)
    );
  } else if (statements.length > 0) {
    statements.unshift(
      env.DB.prepare(
        "UPDATE templates SET updated_at = datetime('now') WHERE id = ?"
      ).bind(templateId)
    );
  }

  if (statements.length === 0) return error('No updates provided', 400);

  await env.DB.batch(statements);

  const template = await buildTemplateResponse(env, templateId);
  return json({ template });
}

/* ─────────────────────────────────────────────────────────────
   DELETE /templates/:id?admin_key=…
   ───────────────────────────────────────────────────────────── */
export async function deleteTemplate(request, env, { id }) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const templateId = Number(id);

  const row = await env.DB.prepare(
    'SELECT cover_r2_key FROM templates WHERE id = ?'
  ).bind(templateId).first();

  if (!row) return json({ ok: true, deleted: false });

  await env.DB.batch([
    env.DB.prepare('DELETE FROM template_rounds WHERE template_id = ?').bind(templateId),
    env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(templateId),
  ]);

  if (row.cover_r2_key) {
    try { await env.AUDIO.delete(row.cover_r2_key); } catch {}
  }

  return json({ ok: true, deleted: true });
}