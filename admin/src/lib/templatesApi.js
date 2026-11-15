// admin/src/lib/templatesApi.js
const BASE = import.meta.env.VITE_CF_BASE || 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'dev-secret-change-me';

async function request(path, options = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}admin_key=${encodeURIComponent(ADMIN_KEY)}`;

  const isForm = options.body instanceof FormData;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(!isForm && options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const templatesApi = {
  list:       ()            => request('/templates'),
  listPublic: ()            => request('/templates?public=1'),
  get:        (id)          => request(`/templates/${id}`),
  create:     (body)        => request('/templates', { method: 'POST', body: JSON.stringify(body) }),
  save:       (id, body)    => request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove:     (id)          => request(`/templates/${id}`, { method: 'DELETE' }),

  uploadCover: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/templates/${id}/cover`, { method: 'POST', body: fd });
  },
  deleteCover: (id) => request(`/templates/${id}/cover`, { method: 'DELETE' }),

  coverUrl: (id) => `${BASE}/templates/${id}/cover`,
};