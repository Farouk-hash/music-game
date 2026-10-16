// game/src/lib/followApi.js
//
// Fetch wrapper for the follow endpoints on music-game-wrangler.
// Mirrors profileApi.js — same BASE derivation, same error shape.
//
// Every call needs `?as=<myProfileId>` — the profile UUID is the
// credential in this project.

const RAW_BASE = import.meta.env.VITE_API_BASE0 ?? '/api/game';
const BASE = RAW_BASE.replace(/\/game\/?$/, '').replace(/\/$/, '');

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

export const followApi = {
  /* ── Reads ─────────────────────────────────────────────── */

  status: (meId, targetId) =>
    request(`/follows/status?as=${meId}&target=${targetId}`),

  friends: (meId) =>
    request(`/follows/friends?as=${meId}`),

  pending: (meId) =>
    request(`/follows/pending?as=${meId}`),

  /* ── Writes ────────────────────────────────────────────── */

  sendRequest: (meId, followeeId) =>
    request(`/follows?as=${meId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followeeId }),
    }),

  accept: (meId, followerId) =>
    request(`/follows/accept?as=${meId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId }),
    }),

  decline: (meId, followerId) =>
    request(`/follows/decline?as=${meId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId }),
    }),

  unfollow: (meId, otherId) =>
    request(`/follows?as=${meId}&other=${otherId}`, {
      method: 'DELETE',
    }),
};

export const FOLLOW_BASE = BASE;