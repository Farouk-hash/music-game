// E:\matb3aa-game\host-sporcle-wrangler\src\routes\state.js
import { json } from "../lib/response";
import { getStub } from '../lib/stub.js';

export async function handleState({ env, url, code }) {
  const since = Number(url.searchParams.get('since') ?? 0);
  const stub = getStub(env, code);
  const state = await stub.getState(since);
  return json(state, state.ok ? 200 : 404);
}