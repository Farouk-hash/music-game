// music-game-wrangler/src/controllers/instrumentals-upload.js
import { json, error } from '../../lib/response.js';

/**
 * PUT /instrumentals/upload?key=instrumentals/<artist_slug>/<track_slug>/<seg>.mp3
 *
 * Body: raw audio bytes.
 *
 * Validation:
 *   - key must start with `instrumentals/`
 *   - key must end with `.mp3`
 *   - key must not contain `..` or leading `/`
 *   - segments must be one of: middle, custom
 */
export async function uploadInstrumental(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) return error('Missing query parameter: key', 400);
  if (!key.startsWith('instrumentals/')) {
    return error('Invalid key — must start with "instrumentals/"', 400);
  }
  if (key.includes('..') || key.startsWith('/')) {
    return error('Invalid key — path traversal not allowed', 400);
  }

  // e.g. instrumentals/عمرو-دياب/اغنية-الحفلة/middle.mp3
  const validKey = /^instrumentals\/[^/]+\/[^/]+\/(middle|custom)\.mp3$/.test(key);
  if (!validKey) {
    return error(
      'Invalid key format — expected instrumentals/<artist>/<track>/<middle|custom>.mp3',
      400
    );
  }

  let body;
  try {
    body = await request.arrayBuffer();
  } catch {
    return error('Failed to read request body', 400);
  }
  if (!body || body.byteLength === 0) {
    return error('Request body is empty', 400);
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — generous for a 10s 64k MP3
  if (body.byteLength > MAX_SIZE) {
    return error(
      `File too large: ${(body.byteLength / 1024).toFixed(0)} KB (max ${MAX_SIZE / 1024} KB)`,
      413
    );
  }

  try {
    await env.AUDIO.put(key, body, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('[uploadInstrumental] R2 put failed:', e);
    return error(`R2 upload failed: ${e.message}`, 500);
  }

  return json(
    { ok: true, r2_key: key, size_bytes: body.byteLength },
    { status: 201 }
  );
}

/**
 * GET /instrumentals/serve?key=instrumentals/…
 *
 * Streams an instrumental from R2. Kept separate from /clips/serve
 * so the two prefixes have independent access rules.
 */
export async function serveInstrumental(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) return error('Missing query parameter: key', 400);
  if (!key.startsWith('instrumentals/')) {
    return error('Invalid key — must start with "instrumentals/"', 400);
  }
  if (key.includes('..')) return error('Invalid key', 400);

  const object = await env.AUDIO.get(key);
  if (!object) return error(`Instrumental not found: ${key}`, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Content-Disposition', 'inline');

  return new Response(object.body, { headers });
}