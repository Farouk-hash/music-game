// game/src/lib/sporcleApi.js
//
// Dedicated fetch wrapper for host-sporcle-wrangler.
//
// The base URL differs by environment:
//   dev  → http://localhost:8788              (direct to the DO Worker)
//   prod → https://host-sporcle-wrangler.…    (deployed)
//
// This deliberately does NOT go through the Express proxy or
// VITE_API_BASE — the Sporcle Worker handles CORS directly.

const FALLBACK_DEV  = 'http://localhost:8788';
const FALLBACK_PROD = 'https://host-sporcle-wrangler.abdulrahman-muhammad2090.workers.dev';

function resolveBase() {
  const fromEnv = import.meta.env.VITE_SPORCLE_BASE;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '');
  if (import.meta.env.DEV) return FALLBACK_DEV;
  return FALLBACK_PROD;
}

const BASE = resolveBase();

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { Accept: 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  // HTTP error → throw with the server's error message.
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

  // 2xx but the payload reports a failure → also throw.
  // This catches servers that don't set the status correctly.
  if (body && typeof body === 'object' && body.ok === false) {
    const err = new Error(body.error ?? 'Request failed');
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}
export const sporcleApi = {
  // ── Room lifecycle ───────────────────────────────────────
  create: ({ hostName, mode, config, autoAdvanceSeconds = 0, profileId = null }) =>
    request('/host-sporcle/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, mode, config, autoAdvanceSeconds, profileId }),
    }),

  join: (code, { name, profileId = null }) =>
    request(`/host-sporcle/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, profileId }),
    }),
  // ── State (long-poll) — accepts an AbortSignal ───────────
  state: (code, since = 0, { signal } = {}) =>
    request(`/host-sporcle/${code}/state?since=${since}`, { signal }),

  // ── Actions ──────────────────────────────────────────────
  action: (code, body) =>
    request(`/host-sporcle/${code}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  // ── Debug (local only — guarded server-side) ─────────────
  debug: (code) => request(`/host-sporcle/${code}/debug`),

  // ── Fire-and-forget leave (used with navigator.sendBeacon) ──
  leaveBeacon: (code, playerId) => {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    const url = `${BASE}/host-sporcle/${code}/leave?playerId=${encodeURIComponent(playerId)}`;
    try {
      return navigator.sendBeacon(url);
    } catch {
      return false;
    }
  },
};

export const SPORCLE_BASE = BASE;