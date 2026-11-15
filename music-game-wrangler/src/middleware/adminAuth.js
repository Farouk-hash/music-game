// music-game-wrangler/src/middleware/adminAuth.js
import { error } from '../lib/response.js';

/**
 * Require ?admin_key=<secret> in the query string.
 * `env.ADMIN_KEY` must be set (dev: wrangler.jsonc `vars`; prod: `wrangler secret put`).
 *
 * Returns null on success (caller proceeds), or a Response on failure.
 */
export function requireAdmin(request, env) {
  const expected = env.ADMIN_KEY;
  if (!expected) return error('ADMIN_KEY not configured on server', 500);

  const url = new URL(request.url);
  const got = url.searchParams.get('admin_key');
  if (!got || got !== expected) return error('Unauthorized', 401);

  return null;
}