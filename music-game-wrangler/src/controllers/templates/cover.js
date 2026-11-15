// music-game-wrangler/src/controllers/templates/cover.js
import { json, error } from '../../lib/response.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { COVER_MAX_BYTES, COVER_ALLOWED_MIME } from '../../utilities/collections/limits.js';

function extFromMime(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png')  return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function uploadCover(request, env, { id }) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const templateId = Number(id);
  const row = await env.DB.prepare(
    'SELECT id, cover_r2_key FROM templates WHERE id = ?'
  ).bind(templateId).first();
  if (!row) return error('Template not found', 404);

  const ct = request.headers.get('content-type') || '';
  if (!ct.startsWith('multipart/form-data')) {
    return error('Expected multipart/form-data', 400);
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return error('file field required', 400);
  if (file.size > COVER_MAX_BYTES) return error(`Cover too large (max ${COVER_MAX_BYTES} bytes)`, 400);
  if (!COVER_ALLOWED_MIME.includes(file.type)) {
    return error(`Only ${COVER_ALLOWED_MIME.join(', ')} allowed`, 400);
  }

  const ext = extFromMime(file.type);
  const key = `templates/${templateId}/cover-${Date.now()}.${ext}`;

  await env.AUDIO.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  if (row.cover_r2_key) {
    try { await env.AUDIO.delete(row.cover_r2_key); } catch {}
  }

  await env.DB.prepare(
    "UPDATE templates SET cover_kind = 'uploaded', cover_r2_key = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(key, templateId).run();

  return json({ ok: true, key });
}

export async function deleteCover(request, env, { id }) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const templateId = Number(id);
  const row = await env.DB.prepare(
    'SELECT id, cover_r2_key FROM templates WHERE id = ?'
  ).bind(templateId).first();
  if (!row) return error('Template not found', 404);

  if (row.cover_r2_key) {
    try { await env.AUDIO.delete(row.cover_r2_key); } catch {}
  }

  await env.DB.prepare(
    "UPDATE templates SET cover_kind = 'generated', cover_r2_key = NULL, updated_at = datetime('now') WHERE id = ?"
  ).bind(templateId).run();

  return json({ ok: true });
}

export async function serveCover(request, env, { id }) {
  const templateId = Number(id);
  const row = await env.DB.prepare(
    'SELECT cover_r2_key FROM templates WHERE id = ?'
  ).bind(templateId).first();
  if (!row || !row.cover_r2_key) return error('No cover', 404);

  const obj = await env.AUDIO.get(row.cover_r2_key);
  if (!obj) return error('Cover not found in storage', 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}