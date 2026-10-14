import { json } from '../lib/response.js';
import { getStub } from '../lib/stub.js';

export async function handleJoin({ request, env, code }) {
  const body = await request.json().catch(() => ({}));
  const stub = getStub(env, code);
  const result = await stub.join(
    body.name ?? 'Guest',
    body.profileId ?? null
  );
  return json(result, { status: result.ok ? 200 : 404 });
}