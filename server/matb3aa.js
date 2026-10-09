import { CookieJar } from 'tough-cookie';
import { fetch as undiciFetch } from 'undici';
import makeFetchCookie from 'fetch-cookie';
import 'dotenv/config';

const BASE = process.env.MATB3AA_BASE;
const API  = process.env.MATB3AA_API;
const UA   = process.env.USER_AGENT;

const jar = new CookieJar();
const fetch = makeFetchCookie(undiciFetch, jar);

let warmedUp = false;
let warmupPromise = null;

export async function warmup(force = false) {
  if (warmedUp && !force) return;
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    console.log('[matb3aa] Warming up session...');
    const r = await fetch(BASE + '/', { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Warmup failed: ${r.status}`);
    warmedUp = true;
    console.log('[matb3aa] Session established');
  })();

  try { await warmupPromise; } finally { warmupPromise = null; }
}

export async function api(path, { retries = 2 } = {}) {
  await warmup();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await fetch(API + path, {
      headers: {
        'Accept': 'application/json',
        'Referer': BASE + '/',
        'User-Agent': UA,
      },
    });

    if (r.status === 401 && attempt < retries) {
      console.log('[matb3aa] 401 — refreshing session');
      await warmup(true);
      continue;
    }

    if (r.status >= 500 && attempt < retries) {
      const delay = 500 * Math.pow(2, attempt);
      console.log(`[matb3aa] ${r.status} — retrying in ${delay}ms`);
      await new Promise(res => setTimeout(res, delay));
      continue;
    }

    if (!r.ok) throw new Error(`matb3aa ${r.status} on ${path}`);
    return r.json();
  }

  throw new Error(`matb3aa failed after ${retries} retries on ${path}`);
}

export async function apiAll(path, { perPage = 100, maxPages = 200 } = {}) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const j = await api(`${path}${sep}perPage=${perPage}&page=${page}`);
    const items = j.pagination?.data || [];
    if (!items.length) break;
    all.push(...items);
    if (!j.pagination?.next_page) break;
  }
  return all;
}

export function audioUrl(src) {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return BASE + '/' + encodeURI(src);
}

export const matb3aa = { warmup, api, apiAll, audioUrl, BASE };