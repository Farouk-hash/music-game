// E:\matb3aa-game\host-sporcle-wrangler\src\router.js
import { json } from './lib/response.js';
import { handleCors } from './lib/cors.js';
import { handleCreate } from './routes/create.js';
import { handleJoin } from './routes/join.js';
import { handleState } from './routes/state.js';
import { handleAction } from './routes/action.js';
import { handleDebug } from './routes/debug.js';
import { getStub } from './lib/stub.js';

const PREFIX = '/host-sporcle';

export async function route(request, env) {
  // CORS preflight — must run before any routing.
  const preflight = handleCors(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const path = url.pathname;

  // GET /health
  if (path === '/health' && request.method === 'GET') {
    return json({ ok: true, time: new Date().toISOString() });
  }

  // POST /host-sporcle/create
  if (path === `${PREFIX}/create`) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    return handleCreate(request, env);
  }

  // POST /host-sporcle/:code/leave?playerId=…
  // Fire-and-forget endpoint for navigator.sendBeacon on tab close.
  // Query-string params only (sendBeacon can't set JSON headers).
  const leaveMatch = path.match(/^\/host-sporcle\/([^/]+)\/leave$/);
  if (leaveMatch) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const [, code] = leaveMatch;
    const playerId = url.searchParams.get('playerId');
    if (!playerId) return json({ error: 'playerId required' }, 400);

    const stub = getStub(env, code);
    const result = await stub.handleAction(playerId, { type: 'leave' });
    return json(result, result.ok ? 200 : 400);
  }

  // /host-sporcle/:code/:action
  const match = path.match(/^\/host-sporcle\/([^/]+)\/(join|state|action|debug)$/);
  if (match) {
    const [, code, action] = match;
    const ctx = { request, env, url, code, action };

    switch (action) {
      case 'join':
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        return handleJoin(ctx);
      case 'state':
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        return handleState(ctx);
      case 'action':
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        return handleAction(ctx);
      case 'debug':
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        return handleDebug(ctx);
    }
  }

  return json({ error: 'Not found' }, 404);
}