// music-game-wrangler/src/index.js
import { handleCors } from './middleware/cors.js';
import { matchRoute } from './routes/index.js';
import { json, error, CORS_HEADERS } from './lib/response.js';

export default {
  async fetch(request, env, ctx) {
    const preflight = handleCors(request);
    if (preflight) return preflight;

    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      try {
        const result = await env.DB
          .prepare('SELECT COUNT(1) AS count FROM genres')
          .first();
        const res = json({ ok: true, time: new Date().toISOString(), genres: result.count });
        Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      } catch (e) {
        const res = error(e.message, 500);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
    }

    const match = matchRoute(request);
    if (!match) {
      const res = error('Not found', 404);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    try {
      // FIXED: Pass ctx as the 3rd argument, params as the 4th
      const response = await match.handler(request, env, ctx, match.params);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    } catch (e) {
      console.error('[worker error]', e);
      const res = error(e.message, 500);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  },
};