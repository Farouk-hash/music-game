// E:\matb3aa-game\host-sporcle-wrangler\src\routes\create.js
import { json } from '../lib/response.js';
import { generateCode } from '../lib/codes.js';
import { getStub } from '../lib/stub.js';

export async function handleCreate(request, env) {
  const body = await request.json().catch(() => ({}));

  const code = generateCode();
  const stub = getStub(env, code);

  const result = await stub.init(
    body.hostName ?? 'Host',
    body.config ?? {},
    body.mode ?? 'speed',
    Number(body.autoAdvanceSeconds ?? 0)
  );

  if (!result.ok) return json({ error: result.error }, 409);

  return json({
    code,
    hostId: result.hostId,
    version: result.version,
  });
}