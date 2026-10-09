import { handleCors } from './middleware/cors.js';
import { matchRoute } from './routes/index.js';
import { json, error } from './lib/response.js';

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
          .prepare('SELECT COUNT(*) AS count FROM genres')
          .first();
        return json({ ok: true, time: new Date().toISOString(), genres: result.count });
      } catch (e) {
        return error(e.message, 500);
      }
    }

    // ── Route dispatch ──────────────────────────────────────
    const match = matchRoute(request);
    if (!match) {

      return error('Not found', 404);
    }

    // ── Invoke the controller ───────────────────────────────
    try {
      return await match.handler(request, env, match.params);
    } catch (e) {
      console.error('[worker error]', e);
      return error(e.message, 500);
    }
  },
};