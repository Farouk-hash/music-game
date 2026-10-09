const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400',
};

/** Successful JSON response with CORS headers */
export function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers || {}) },
  });
}

/** Error response with a consistent shape */
export function error(message, status = 500, extra = {}) {
  return json({ error: message, ...extra }, { status });
}

/** Validation error with a list of field-level messages */
export function validationError(errors) {
  return json({ error: 'Validation failed', errors }, { status: 400 });
}

export { CORS_HEADERS };