// host-sporcle-wrangler/src/routes/state.js
import { json } from "../lib/response";
import { getStub } from '../lib/stub.js';

export async function handleState({ env, url, code }) {
  const since = Number(url.searchParams.get('since') ?? 0);
  const playerId = url.searchParams.get('playerId') || null;
  const stub = getStub(env, code);
  const state = await stub.getState(since, playerId);
  return json(state, state.ok ? 200 : 404);
}