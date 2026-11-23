import { BASE, guardedFetch } from './api.js'; 

async function request(path, options = {}) {
  // ✅ Use guardedFetch instead of raw fetch
  const res = await guardedFetch(BASE + path, {
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

export const streakApi = {
  config: () => request('/streaks/config'),
  challenge: (date, genreId = null) => {
    const qs = genreId == null ? '' : `?genreId=${genreId}`;
    return request(`/streaks/challenge/${date}${qs}`);
  },
  list: (profileId) => request(`/streaks/list/${profileId}`),
  start: (profileId, genreId) => request('/streaks/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, genreId }),
  }),
  abandon: (profileId, genreId) => request('/streaks/abandon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, genreId }),
  }),
  submit: (date, body) => request(`/streaks/attempt/${date}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
  grantBonus: (date, profileId) => request(`/streaks/bonus-power/${date}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
  }),
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}