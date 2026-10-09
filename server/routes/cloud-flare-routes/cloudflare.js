import 'dotenv/config';

const CF_BASE  = process.env.CF_API_BASE;
const CF_TOKEN = process.env.CF_API_TOKEN;

if (!CF_BASE) {
  console.warn('[cloudflare] CF_API_BASE is not set — Cloudflare calls will fail');
} else {
  console.log(`[cloudflare] base URL: ${CF_BASE}`);
}

/**
 * Call the Cloudflare Worker. Returns parsed JSON.
 *
 *   cloudflare.get('/genres')
 *   cloudflare.post('/genres', { id, name, display_name, image })
 *   cloudflare.put('/genres/1', { ... })
 *   cloudflare.delete('/genres/1')
 */
async function cf(path, options = {}) {
  const url = CF_BASE + path;

  const headers = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(CF_TOKEN ? { 'Authorization': `Bearer ${CF_TOKEN}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  // The Worker always returns JSON — parse regardless of status
  let data = null;
  try {
    data = await res.json();
  } catch {
    const raw = await res.text().catch(() => '');
    data = { error: `Non-JSON response (${res.status})`, raw: raw.slice(0, 200) };
  }

  if (!res.ok) {
    const message = data?.error || `${res.status} ${res.statusText}`;
    const err = new Error(`Cloudflare: ${message}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export const cloudflare = {
  get:    (path)       => cf(path),
  post:   (path, body) => cf(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => cf(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => cf(path, { method: 'DELETE' }),
};