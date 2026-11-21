// music-game-wrangler/src/controllers/collections/cover.js
import { json, error } from '../../lib/response.js';
import { validateCoverUpload } from '../../utilities/collections/coverValidation.js';
import { buildCollectionResponse } from './collections.js';

const COVER_PREFIX = 'collection-covers';

async function loadCollection(env, profileId, collectionId) {
  return env.DB.prepare(
    'SELECT id, profile_id, cover_r2_key FROM collections WHERE id = ? AND profile_id = ?'
  ).bind(collectionId, profileId).first();
}

/**
 * Persist a cover for an existing collection. Used by both the standalone
 * upload endpoint AND the create/save handlers when the request body
 * carries a cover file.
 *
 * Returns { ok: true } on success, { ok: false, error } on failure.
 *
 * Failure semantics: if the R2 put succeeds but the DB update fails, the
 * R2 object is orphaned. Cleaned up by the next successful upload or by
 * the delete-collection path. Not rolled back here.
 */
export async function persistCover(env, profileId, collectionId, file) {
  const check = validateCoverUpload(file);
  if (!check.ok) return { ok: false, error: check.error };

  const row = await loadCollection(env, profileId, collectionId);
  if (!row) return { ok: false, error: 'Collection not found' };

  const key = `${COVER_PREFIX}/${collectionId}/cover-${Date.now()}.${check.ext}`;
  const arrayBuffer = await file.arrayBuffer();
  await env.AUDIO.put(key, arrayBuffer, { httpMetadata: { contentType: file.type } });

  if (row.cover_r2_key && row.cover_r2_key !== key) {
    try { await env.AUDIO.delete(row.cover_r2_key); }
    catch (e) { console.warn('[persistCover] old R2 delete failed:', e.message); }
  }

  await env.DB.prepare(
    `UPDATE collections
        SET cover_kind = 'uploaded',
            cover_r2_key = ?,
            updated_at = datetime('now')
      WHERE id = ? AND profile_id = ?`
  ).bind(key, collectionId, profileId).run();

  return { ok: true };
}

// POST /profiles/:profileId/collections/:id/cover
export async function uploadCover(request, env,ctx, { profileId, id }) {
  const collectionId = Number(id);
  const row = await loadCollection(env, profileId, collectionId);
  if (!row) return error('Collection not found', 404);

  let form;
  try {
    form = await request.formData();
  } catch {
    return error('Expected multipart/form-data', 400);
  }

  const file = form.get('file');
  const result = await persistCover(env, profileId, collectionId, file);
  if (!result.ok) return error(result.error, 400);

  const collection = await buildCollectionResponse(env, profileId, collectionId);
  return json({ ok: true, collection });
}

// DELETE /profiles/:profileId/collections/:id/cover
export async function deleteCover(request, env, ctx,{ profileId, id }) {
  const collectionId = Number(id);
  const row = await loadCollection(env, profileId, collectionId);
  if (!row) return error('Collection not found', 404);

  if (row.cover_r2_key) {
    try { await env.AUDIO.delete(row.cover_r2_key); }
    catch (e) { console.warn('[deleteCover] R2 delete failed:', e.message); }
  }

  await env.DB.prepare(
    `UPDATE collections
        SET cover_kind = 'generated',
            cover_r2_key = NULL,
            updated_at = datetime('now')
      WHERE id = ? AND profile_id = ?`
  ).bind(collectionId, profileId).run();

  const collection = await buildCollectionResponse(env, profileId, collectionId);
  return json({ ok: true, collection });
}

// GET /profiles/:profileId/collections/:id/cover
export async function serveCover(request, env, ctx,{ profileId, id }) {
  const collectionId = Number(id);
  const row = await env.DB.prepare(
    'SELECT cover_r2_key FROM collections WHERE id = ? AND profile_id = ?'
  ).bind(collectionId, profileId).first();

  if (!row || !row.cover_r2_key) return error('Cover not found', 404);

  const object = await env.AUDIO.get(row.cover_r2_key);
  if (!object) return error('Cover not found', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
}