// host-sporcle-wrangler/src/routes/action.js
import { json } from '../lib/response.js';
import { getStub } from '../lib/stub.js';
import { notifyRoomDestroyed, wasRoomDestroyed } from '../lib/cleanup.js';



export async function handleAction({ request, env, code, execCtx }) {
  const body = await request.json().catch(() => ({}));
  if (!body.playerId) return json({ error: 'playerId required' }, 400);

  const stub = getStub(env, code);
  const result = await stub.handleAction(body.playerId, body);

  if (body.type === 'leave' && wasRoomDestroyed(result)) {
    execCtx.waitUntil(notifyRoomDestroyed(env, code));
  }

  return json(result, result.ok ? 200 : 400);
}