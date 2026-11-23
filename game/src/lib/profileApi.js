// game/src/lib/profileApi.js
//
// Profile endpoints on music-game-wrangler. All requests go through the shared
// guarded request in api.js, so they fail fast when offline.

import { BASE, requestBase as request } from './api.js';

export const profileApi = {
  create: ({ nickname }) =>
    request('/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    }),

  recover: ({ recoveryCode, email, phone }) =>
    request('/profiles/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode, email, phone }),
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
      // No Content-Type: the browser sets the multipart boundary.
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