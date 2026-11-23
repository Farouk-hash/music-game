// game/src/lib/api.js
export const PREFIX = import.meta.env.VITE_API_BASE ?? '/api/game';
export const RAW_BASE = import.meta.env.VITE_API_BASE0 ?? '/api/game';
export const BASE = RAW_BASE.replace(/\/game\/?$/, '').replace(/\/$/, '');

/** true for errors that mean "no usable network" (as opposed to an API error). */
export function isNetworkError(err) {
  return !!err?.isNetworkError || !!err?.isOffline;
}

export function offlineError() {
  const err = new Error('No internet connection');
  err.isOffline = true;
  err.isNetworkError = true;
  err.status = 0;
  return err;
}

/**
 * The ONE place every API module should call instead of `fetch`.
 *  - offline: throws immediately, no request is made
 *  - network failure: throws a tagged error (isNetworkError)
 *  - aborted requests (React Query cancellation) are re-thrown untouched
 */
export async function guardedFetch(url, options) {
  if (!navigator.onLine) throw offlineError();
  try {
    return await fetch(url, options);
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    if (!navigator.onLine) throw offlineError();
    const err = new Error('Server unreachable');
    err.isNetworkError = true;
    err.isOffline = false;
    err.status = 0;
    err.cause = cause;
    throw err;
  }
}

async function requestUrl(url, options = {}) {
  const res = await guardedFetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
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

const request = (path, options) => requestUrl(PREFIX + path, options);

/** Same as `request` but relative to BASE (profiles, follows, ...). */
export const requestBase = (path, options) => requestUrl(BASE + path, options);

export const api = {
  get:  (path)       => request(path),
  post: (path, body) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }),
};