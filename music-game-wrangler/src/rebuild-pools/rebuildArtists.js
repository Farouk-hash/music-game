import { buildPoolForArtists } from "../lib/cache";
import { json } from "../lib/response";

/**
 * Incremental pool rebuild for specific artists.
 * Used by the admin panel after uploading new tracks/lyrics.
 * POST /game/catalog/rebuild-artists?admin_key=...
 * Body: { "artistIds": [1, 42, 105] }
 */
export async function rebuildArtists(request, env, ctx) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('admin_key');
  
  if (adminKey !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const artistIds = Array.isArray(body.artistIds) 
    ? body.artistIds.map(id => Number(id)).filter(n => Number.isFinite(n) && n > 0)
    : [];

  if (artistIds.length === 0) {
    return json({ ok: false, error: 'artistIds array is required' }, {}, 400);
  }

  if (artistIds.length > 50) {
    return json({ ok: false, error: 'Max 50 artists per rebuild' }, {}, 400);
  }

  try {
    const started = Date.now();
    await buildPoolForArtists(env, artistIds);
    
    // Also invalidate the catalog cache so counts update
    await Promise.all([
      env.CATALOG_CACHE.delete('catalog:v1').catch(() => {}),
      env.CATALOG_CACHE.delete('templates:public:v1').catch(() => {}),
    ]);

    return json({
      ok: true,
      rebuilt: artistIds.length,
      artistIds,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error('Incremental rebuild failed:', err);
    return json({ ok: false, error: err.message }, {}, 500);
  }
}