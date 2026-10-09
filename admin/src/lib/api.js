const BASE = '/api';   // Vite proxies to localhost:3001

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText, path);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(status, message, path) {
    super(`${status} ${path}: ${message}`);
    this.status = status;
    this.path = path;
  }
}

export const api = {
  get:  (path)        => request(path),
  post: (path, body)  => request(path, { method: 'POST', body: JSON.stringify(body) }),

  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
};