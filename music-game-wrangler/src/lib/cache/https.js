// music-game-wrangler/src/lib/cache/https.js


/**
 * Global, edge-cached JSON response helper.
 * Lookup order: KV → Edge Cache → fetcher (D1).
 * On miss: awaits KV write for consistency, fire-and-forgets Edge write.
 */

export async function cachedJsonResponse(
  request, env, ctx, key, kvTtlSeconds, edgeTtlSeconds, fetcher, options = {}
) {
  const { bypass = false } = options;
  const cache = caches.default;
  const url = new URL(request.url);
  const cacheKey = new Request(`${url.origin}/__cache/${key}`, { method: 'GET' });

  // 1. KV (global source of truth)
  if (!bypass && env.CATALOG_CACHE) {
    try {
      const kvHit = await env.CATALOG_CACHE.get(key, { type: 'json' });
      if (kvHit) return jsonResponse(kvHit, { 'X-Cache': 'KV', 'Cache-Control': `public, max-age=${edgeTtlSeconds}` });
    } catch (err) {
      console.warn('KV read failed', key, err?.message);
    }
  }

  // 2. Cache API (per-colo Worker cache)
  if (!bypass) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          headers: withHeader(cached.headers, 'X-Cache', 'EDGE'),
        });
      }
    } catch (err) {
      console.warn('Cache API read failed', key, err?.message);
    }
  }

  // 3. Origin (D1)
  let data;
  try {
    data = await fetcher();
  } catch (err) {
    return jsonResponse({ error: err?.message || 'fetch_failed' }, {}, 500);
  }

  // 4. Populate KV (AWAIT to guarantee consistency before responding)
  if (env.CATALOG_CACHE) {
    try {
      await env.CATALOG_CACHE.put(key, JSON.stringify(data), { expirationTtl: kvTtlSeconds });
    } catch (err) {
      console.error('CRITICAL: KV write failed', key, err?.message);
    }
  }

  // 5. Populate Edge Cache & Return
  const cacheControlHeader = `public, max-age=${edgeTtlSeconds}`;
  const response = jsonResponse(data, { 
    'X-Cache': 'MISS',
    'Cache-Control': cacheControlHeader //  CRITICAL: Tells Cloudflare CDN to cache this
  });
  
  const toCache = response.clone();
  const cacheable = new Response(toCache.body, {
    status: 200,
    headers: {
      ...Object.fromEntries(toCache.headers),
    },
  });
  
  ctx.waitUntil(
    cache.put(cacheKey, cacheable)
      .catch((err) => console.warn('Cache API write failed', key, err?.message))
  );

  return response;
}

export async function invalidateCache(env, ctx, key, originUrl) {
  const tasks = [];
  if (env.CATALOG_CACHE) {
    tasks.push(env.CATALOG_CACHE.delete(key).catch(() => {}));
  }
  if (originUrl) {
    const cacheKey = new Request(`${originUrl}/__cache/${key}`, { method: 'GET' });
    tasks.push(caches.default.delete(cacheKey).catch(() => {}));
  }
  await Promise.all(tasks);
}

function jsonResponse(data, extraHeaders = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function withHeader(headers, name, value) {
  const h = new Headers(headers);
  h.set(name, value);
  return h;
}