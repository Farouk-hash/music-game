// game/src/lib/collectionsApi.js

import { BASE } from "./api";

async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

async function requestMultipart(path, { method, fields, file, signal } = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields ?? {})) {
    form.append(key, JSON.stringify(value));
  }
  if (file) {
    form.append('file', file);
  }
  const res = await fetch(`${BASE}${path}`, { method, body: form, signal });
  return handleResponse(res);
}

async function handleResponse(res) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const collectionsApi = {
  list: (profileId, { signal } = {}) =>
    requestJson(`/profiles/${profileId}/collections`, { signal }),

  get: (profileId, id, { signal } = {}) =>
    requestJson(`/profiles/${profileId}/collections/${id}`, { signal }),

  create: (profileId, body, file = null) => {
    if (file) {
      return requestMultipart(`/profiles/${profileId}/collections`, {
        method: 'POST',
        fields: body,
        file,
      });
    }
    return requestJson(`/profiles/${profileId}/collections`, { method: 'POST', body });
  },

  save: (profileId, id, body, file = null) => {
    if (file) {
      return requestMultipart(`/profiles/${profileId}/collections/${id}`, {
        method: 'PUT',
        fields: body,
        file,
      });
    }
    return requestJson(`/profiles/${profileId}/collections/${id}`, { method: 'PUT', body });
  },

  remove: (profileId, id) =>
    requestJson(`/profiles/${profileId}/collections/${id}`, { method: 'DELETE' }),

  uploadCover: async (profileId, id, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/profiles/${profileId}/collections/${id}/cover`, {
      method: 'POST',
      body: form,
    });
    return handleResponse(res);
  },

  removeCover: (profileId, id) =>
    requestJson(`/profiles/${profileId}/collections/${id}/cover`, { method: 'DELETE' }),

   clone: (profileId, { sourceId, name }) =>
    requestJson(`/profiles/${profileId}/collections/clone`, {
      method: 'POST',
      body: { sourceId, name },
    }),
};