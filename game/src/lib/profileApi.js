// game/src/lib/profileApi.js
//
// Fetch wrapper for the profile endpoints on music-game-wrangler.
// Parallel to sporcleApi.js. Uses the same base URL as api.js
// (VITE_API_BASE / /api/game), since profiles live in the same Worker.


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

export const profileApi = {
  create: ({ nickname }) =>
    request('/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    }),

  recover: ({ recoveryCode }) =>
    request('/profiles/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode }),
    }),

  get: (id) => request(`/profiles/${id}`),

  patch: (id, patch) =>
    request(`/profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),

  save: (id, payload) =>
    request(`/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  uploadAvatar: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/profiles/${id}/avatar`, {
      method: 'POST',
      body: fd,
      // No Content-Type — the browser sets multipart boundary.
    });
  },

  deleteAvatar: (id) =>
    request(`/profiles/${id}/avatar`, { method: 'DELETE' }),

  // URL helper for <img src>. Used when avatar.kind === 'uploaded'.
  avatarUrl: (id) => `${BASE}/profiles/${id}/avatar`,

  addFavorite: (id, kind, value) =>
    request(`/profiles/${id}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, value: String(value) }),
    }),

  removeFavorite: (id, kind, value) =>
    request(`/profiles/${id}/favorites`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, value: String(value) }),
    }),

  deleteProfile: (id) =>
    request(`/profiles/${id}`, { method: 'DELETE' }),
};

export function absoluteAvatarUrl(profile) {
  if (profile?.avatar?.kind !== 'uploaded') return null;
  return `${BASE}/profiles/${profile.id}/avatar`;
}