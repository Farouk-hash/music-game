// game/src/lib/inviteApi.js
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

export const inviteApi = {
  pending: (meId) =>
    request(`/invites/pending?as=${meId}`),

  roomInvites: (meId, roomCode) =>
    request(`/invites/room?as=${meId}&code=${roomCode}`),

  send: (meId, roomCode, friendIds, revokedIds = []) =>
    request(`/invites?as=${meId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, friendIds, revokedIds }),
    }),

  dismiss: (meId, inviteId) =>
    request(`/invites/dismiss?as=${meId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    }),
};