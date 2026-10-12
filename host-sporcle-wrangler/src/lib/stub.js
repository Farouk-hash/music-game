// E:\matb3aa-game\host-sporcle-wrangler\src\lib\stub.js
/**
 * Return the Durable Object stub for the given room code.
 * Throws if `env.HOST_SPORCLE` isn't bound — surfaces config errors early.
 */
export function getStub(env, code) {
  if (!env.HOST_SPORCLE) {
    throw new Error('HOST_SPORCLE binding missing from env');
  }
  const id = env.HOST_SPORCLE.idFromName(code);
  return env.HOST_SPORCLE.get(id);
}