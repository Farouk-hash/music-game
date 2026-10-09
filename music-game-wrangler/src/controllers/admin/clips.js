// music-game-wrangler/src/controllers/clips.js
import { json, error } from '../../lib/response.js';

/**
 * Build the R2 key for a clip rendition.
 *   clips/track-123-start-10s.mp3          (forward)
 *   clips/track-123-start-10s-rev.mp3      (reversed)
 *   clips/quran/track-…-rev.mp3            (quran, reversed)
 *   clips/upload/track-…-rev.mp3           (upload, reversed)
 */
function buildKey({ source, trackId, position, startSec, durationSec, reversed }) {
  const prefix =
    source === 'quran'  ? 'clips/quran'  :
    source === 'upload' ? 'clips/upload' :
                          'clips';
  const base = position === 'custom'
    ? `${prefix}/track-${trackId}-custom-${startSec}s-${durationSec}s`
    : `${prefix}/track-${trackId}-${position}-${durationSec}s`;
  return reversed ? `${base}-rev.mp3` : `${base}.mp3`;
}

export async function uploadClip(request, env, { trackId }) {
  const url = new URL(request.url);
  const position    = url.searchParams.get('position') || 'start';
  const durationMs  = Number(url.searchParams.get('duration') || 10000);
  const startSec    = Number(url.searchParams.get('start') || 0);
  const source      = url.searchParams.get('source') || 'music';
  const reversed    = url.searchParams.get('reversed') === '1';

  const validPositions = ['start', 'middle', 'end', 'custom'];
  if (!validPositions.includes(position)) {
    return error(`position must be one of: ${validPositions.join(', ')}`, 400);
  }
  if (!['music', 'quran', 'upload'].includes(source)) {
    return error('source must be "music", "quran", or "upload"', 400);
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

  const MAX_SIZE = 2 * 1024 * 1024;
  if (body.byteLength > MAX_SIZE) {
    return error(
      `Clip too large: ${(body.byteLength / 1024).toFixed(0)} KB (max ${MAX_SIZE / 1024} KB)`,
      413
    );
  }

  const durationSec = Math.round(durationMs / 1000);
  const r2Key = buildKey({
    source, trackId, position, startSec, durationSec, reversed,
  });

  try {
    await env.AUDIO.put(r2Key, body, {
      httpMetadata: {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        trackId: String(trackId),
        position,
        durationMs: String(durationMs),
        source,
        reversed: reversed ? '1' : '0',
      },
    });
  } catch (e) {
    console.error('[uploadClip] R2 put failed:', e);
    return error(`R2 upload failed: ${e.message}`, 500);
  }

  return json(
    {
      ok: true,
      r2_key: r2Key,
      size_bytes: body.byteLength,
      position,
      duration_ms: durationMs,
      source,
      reversed,
    },
    { status: 201 }
  );
}

export async function serveClip(request, env) {
  const url = new URL(request.url);
  const r2Key = url.searchParams.get('key');

  if (!r2Key) return error('Missing query parameter: key', 400);
  if (!r2Key.startsWith('clips/')) {
    return error('Invalid key — must start with "clips/"', 400);
  }

  // Accepts:
  //   clips/track-…-start-10s.mp3
  //   clips/track-…-start-10s-rev.mp3
  //   clips/quran/track-…-…-rev.mp3
  //   clips/upload/track-…-custom-5s-20s-rev.mp3
  const validKey =
    /^clips\/(quran\/|upload\/)?track-[\w-]+-(start|middle|end|custom|[\w-]+)(-[a-z0-9]+s)?-\d+s(-rev)?\.mp3$/
      .test(r2Key);
  if (!validKey) {
    return error('Invalid clip key format', 400);
  }

  const object = await env.AUDIO.get(r2Key);
  if (!object) return error(`Clip not found: ${r2Key}`, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Content-Disposition', 'inline');

  return new Response(object.body, { headers });
}

export async function headClip(request, env, { trackId, position }) {
  const url = new URL(request.url);
  const durationSec = Math.round(Number(url.searchParams.get('duration') || 10000) / 1000);
  const source = url.searchParams.get('source') || 'music';
  const reversed = url.searchParams.get('reversed') === '1';
  const r2Key = buildKey({
    source, trackId, position, startSec: 0, durationSec, reversed,
  });

  const head = await env.AUDIO.head(r2Key);
  if (!head) return error(`Clip not found: ${r2Key}`, 404);

  return json({
    exists: true,
    r2_key: r2Key,
    size: head.size,
    uploaded: head.uploaded,
    reversed,
  });
}

export async function deleteClip(request, env, { trackId, position }) {
  const url = new URL(request.url);
  const durationSec = Math.round(Number(url.searchParams.get('duration') || 10000) / 1000);
  const source = url.searchParams.get('source') || 'music';
  const reversed = url.searchParams.get('reversed') === '1';
  const r2Key = buildKey({
    source, trackId, position, startSec: 0, durationSec, reversed,
  });

  const head = await env.AUDIO.head(r2Key);
  if (!head) return error(`Clip not found: ${r2Key}`, 404);

  await env.AUDIO.delete(r2Key);
  return json({ ok: true, deleted: r2Key });
}