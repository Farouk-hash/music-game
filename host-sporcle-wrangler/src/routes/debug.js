// E:\matb3aa-game\host-sporcle-wrangler\src\routes\debug.js
import { json } from "../lib/response";
import { getStub } from '../lib/stub.js';

export async function handleDebug({ env, url, code }) {
  // Local-only guard.
  const host = url.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return json({ error: 'Not found' }, 404);
  }

  const stub = getStub(env, code);
  const result = await stub.debugCurrentQuestion();
  return json(result, result.ok ? 200 : 404);
}