// E:\matb3aa-game\host-sporcle-wrangler\src\routes\action.js
import { json } from "../lib/response";
import { getStub } from '../lib/stub.js';

export async function handleAction({ request, env, code }) {
  const body = await request.json().catch(() => ({}));
  if (!body.playerId) return json({ error: 'playerId required' }, 400);

  const stub = getStub(env, code);
  const result = await stub.handleAction(body.playerId, body);
  return json(result, result.ok ? 200 : 400);
}