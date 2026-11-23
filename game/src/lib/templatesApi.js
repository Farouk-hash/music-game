// game/src/lib/templatesApi.js
import { BASE, guardedFetch } from './api.js';

async function requestJson(path, { signal } = {}) {
  const res = await guardedFetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const templatesApi = {
  /** GET /templates?public=1 — the client only sees public templates. */
  list: ({ signal } = {}) =>
    requestJson('/templates?public=1', { signal }),

  /** GET /templates/:id */
  get: (id, { signal } = {}) =>
    requestJson(`/templates/${id}`, { signal }),

  /** Absolute URL for the cover image (used by <Image> / useWorkerImage). */
  coverUrl: (id) => `${BASE}/templates/${id}/cover`,
};