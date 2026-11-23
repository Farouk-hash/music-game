// game/src/lib/followApi.js
//
// Follow endpoints on music-game-wrangler. Mirrors profileApi.js; requests go
// through the shared guarded request in api.js (fail fast when offline).
//
// Every call needs `?as=<myProfileId>`: the profile UUID is the credential.

import { BASE, requestBase as request } from './api.js';

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