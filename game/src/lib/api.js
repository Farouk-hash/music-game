// game/src/lib/api.js
//
// Thin fetch wrapper. All game data comes from the Cloudflare Worker via
// the /api/game prefix (proxied in dev by Vite; same-origin in prod).

const PREFIX = import.meta.env.VITE_API_BASE ?? '/api/game';

async function request(path, options = {}) {
  const res = await fetch(PREFIX + path, {
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && body.error) ||
      (typeof body === 'string' && body) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

export const api = {
  get:  (path)        => request(path),
  post: (path, body)  => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }),
};