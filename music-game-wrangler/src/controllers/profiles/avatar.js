// music-game-wrangler/src/controllers/profiles/avatar.js
import { json, error } from '../../lib/response.js';
import { validateAvatarUpload } from '../../utilities/profile/imageValidation.js';
import { buildProfileResponse } from './profiles.js';

const AVATAR_PREFIX = 'avatars';

/* ═══════════════════════════════════════════════════════════
   POST /profiles/:id/avatar
   ═══════════════════════════════════════════════════════════ */
export async function uploadAvatar(request, env, { id }) {
  const profile = await env.DB.prepare(
    'SELECT id, avatar_r2_key FROM profiles WHERE id = ?'
  ).bind(id).first();
  if (!profile) return error('Profile not found', 404);

  let form;
  try {
    form = await request.formData();
  } catch {
    return error('Expected multipart/form-data', 400);
  }

  const file = form.get('file');
  const check = validateAvatarUpload(file);
  if (!check.ok) return error(check.error, 400);

  const timestamp = Date.now();
  const key = `${AVATAR_PREFIX}/${id}/avatar-${timestamp}.${check.ext}`;

  const arrayBuffer = await file.arrayBuffer();
  await env.AUDIO.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  if (profile.avatar_r2_key && profile.avatar_r2_key !== key) {
    try { await env.AUDIO.delete(profile.avatar_r2_key); }
    catch (e) { console.warn('[uploadAvatar] old R2 delete failed:', e.message); }
  }

  await env.DB.prepare(
    `UPDATE profiles
        SET avatar_kind = 'uploaded',
            avatar_r2_key = ?,
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(key, id).run();

  const updated = await buildProfileResponse(env, id);
  return json({ ok: true, profile: updated });
}

/* ═══════════════════════════════════════════════════════════
   DELETE /profiles/:id/avatar
   ═══════════════════════════════════════════════════════════ */
export async function deleteAvatar(request, env, { id }) {
  const profile = await env.DB.prepare(
    'SELECT id, avatar_r2_key FROM profiles WHERE id = ?'
  ).bind(id).first();
  if (!profile) return error('Profile not found', 404);

  if (profile.avatar_r2_key) {
    try { await env.AUDIO.delete(profile.avatar_r2_key); }
    catch (e) { console.warn('[deleteAvatar] R2 delete failed:', e.message); }
  }

  await env.DB.prepare(
    `UPDATE profiles
        SET avatar_kind = 'generated',
            avatar_r2_key = NULL,
            updated_at = datetime('now')
      WHERE id = ?`
  ).bind(id).run();

  const updated = await buildProfileResponse(env, id);
  return json({ ok: true, profile: updated });
}

/* ═══════════════════════════════════════════════════════════
   GET /profiles/:id/avatar
   ═══════════════════════════════════════════════════════════ */
export async function serveAvatar(request, env, { id }) {
  const profile = await env.DB.prepare(
    'SELECT avatar_r2_key FROM profiles WHERE id = ?'
  ).bind(id).first();

  if (!profile || !profile.avatar_r2_key) {
    return error('Avatar not found', 404);
  }

  const object = await env.AUDIO.get(profile.avatar_r2_key);
  if (!object) return error('Avatar not found', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
}