// music-game-wrangler/src/index.js
import { handleCors } from './middleware/cors.js';
import { matchRoute } from './routes/index.js';
import { json, error, CORS_HEADERS } from './lib/response.js';

export default {
  async fetch(request, env, ctx) {
    // ── Middleware: CORS preflight ──────────────────────────
    const preflight = handleCors(request);
    if (preflight) return preflight;

    const url = new URL(request.url);

    // ── Health check (not in the route table — it's infrastructure) ──
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

    // ── Route dispatch ──────────────────────────────────────
    const match = matchRoute(request);
    if (!match) {
      const res = error('Not found', 404);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // ── Invoke the controller ───────────────────────────────
    try {
      const response = await match.handler(request, env, match.params);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    } catch (e) {
      console.error('[worker error]', e);
      const res = error(e.message, 500);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));  // ← FIXED
      return res;
    }
  },
};