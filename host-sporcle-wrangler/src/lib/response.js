// host-sporcle-wrangler/src/lib/response.js
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

/**
 * Successful JSON response with CORS headers.
 *
 * `init` may be:
 *   - a number → treated as the status code
 *   - an object → treated as ResponseInit
 *   - omitted  → status 200
 */
export function json(data, init = {}) {
  const normalized =
    typeof init === 'number' ? { status: init } : init;

  return Response.json(data, {
    ...normalized,
    headers: { ...CORS_HEADERS, ...(normalized.headers || {}) },
  });
}

export function error(message, status = 500, extra = {}) {
  return json({ error: message, ...extra }, { status });
}

export function validationError(errors) {
  return json({ error: 'Validation failed', errors }, { status: 400 });
}

export { CORS_HEADERS };