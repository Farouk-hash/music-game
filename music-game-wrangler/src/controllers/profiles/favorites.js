// music-game-wrangler/src/controllers/profiles/favorites.js
import { json, error } from '../../lib/response.js';
import {
  validateFavorite,
  FAVORITES_PER_KIND_MAX,
  FAVORITES_TOTAL_MAX,
} from '../../utilities/profile/profileLimits.js';
import { buildProfileResponse } from './profiles.js';

/* ═══════════════════════════════════════════════════════════
   POST /profiles/:id/favorites
   ═══════════════════════════════════════════════════════════ */
export async function addFavorite(request, env, { id }) {
  const body = await request.json().catch(() => null);
  const v = validateFavorite(body?.kind, body?.value);
  if (!v.ok) return error(v.error, 400);

  const profile = await env.DB.prepare(
    'SELECT id FROM profiles WHERE id = ?'
  ).bind(id).first();
  if (!profile) return error('Profile not found', 404);

  const kindCount = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM profile_favorites WHERE profile_id = ? AND kind = ?'
  ).bind(id, v.kind).first();
  if ((kindCount?.n ?? 0) >= FAVORITES_PER_KIND_MAX) {
    return error(`Maximum ${FAVORITES_PER_KIND_MAX} favorites per kind`, 400);
  }

  const totalCount = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM profile_favorites WHERE profile_id = ?'
  ).bind(id).first();
  if ((totalCount?.n ?? 0) >= FAVORITES_TOTAL_MAX) {
    return error(`Maximum ${FAVORITES_TOTAL_MAX} favorites total`, 400);
  }

  await env.DB.prepare(
    `INSERT INTO profile_favorites (profile_id, kind, value)
     VALUES (?, ?, ?)
     ON CONFLICT(profile_id, kind, value) DO NOTHING`
  ).bind(id, v.kind, v.value).run();

  await env.DB.prepare(
    "UPDATE profiles SET updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  const updated = await buildProfileResponse(env, id);
  return json({ ok: true, kind: v.kind, value: v.value, profile: updated });
}

/* ═══════════════════════════════════════════════════════════
   DELETE /profiles/:id/favorites
   ═══════════════════════════════════════════════════════════ */
export async function removeFavorite(request, env, { id }) {
  const body = await request.json().catch(() => null);
  const v = validateFavorite(body?.kind, body?.value);
  if (!v.ok) return error(v.error, 400);

  await env.DB.prepare(
    'DELETE FROM profile_favorites WHERE profile_id = ? AND kind = ? AND value = ?'
  ).bind(id, v.kind, v.value).run();

  await env.DB.prepare(
    "UPDATE profiles SET updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  const updated = await buildProfileResponse(env, id);
  return json({ ok: true, kind: v.kind, value: v.value, profile: updated });
}