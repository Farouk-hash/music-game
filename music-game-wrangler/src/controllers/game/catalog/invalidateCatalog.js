import { json } from '../../../lib/response.js';
import { requireAdmin } from '../../../middleware/adminAuth.js';

import {
  buildAndStorePools,
  invalidateCache,
} from '../../../lib/cache.js';

export async function invalidateCatalog(request, env, ctx) {
  const url = new URL(request.url);
  if (url.searchParams.get('admin_key') !== env.ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const limit  = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 25);

  try {
    const result = await buildAndStorePools(env, { offset, limit });

    if (result.done) {
      await Promise.all([
        invalidateCache(env, ctx, 'catalog:v1', url.origin), // KV + edge cache
        env.CATALOG_CACHE.delete('templates:public:v1').catch(() => {}),
      ]);
    }

    return json({
      ok: true,
      message: result.done
        ? 'Pools rebuilt and catalog cache cleared.'
        : `Chunk built. Call again with offset=${result.nextOffset}.`,
      ...result,
    });
  } catch (err) {
    console.error('Invalidate failed:', err);
    return new Response(`Rebuild failed: ${err.message}`, { status: 500 });
  }
}