// rounds-methods/distractors.js
//
// No per-round D1 queries. Sources, in order:
//   - the same artist's data (already loaded into the in-isolate memo)
//   - other in-scope artists that are already in memory (peekLoaded, zero KV reads)
//   - catalog (KV, memoized) for artist names
//   - one cached D1 query as a last resort for track/album names
//
// NOTE: never mutate arrays that come from the pool. Only shuffle fresh copies.

import { normalize } from '../../../utilities/normalize.js';
import { shuffle } from '../../../utilities/shuffle.js';
import { safeParseArray } from '../../../utilities/safeParseArray.js';
import {
  getCatalogFromKV,
  buildCatalogIndex,
  loadArtistData,
  peekLoaded,
} from '../../../lib/cache.js';

const NEED = 3;
const rand = (n) => Math.floor(Math.random() * n);

/** Up to `limit` distinct random items, without mutating `arr`. */
function randomOrder(arr, limit) {
  if (!arr || arr.length === 0) return [];
  if (arr.length <= limit * 2) return shuffle(arr.slice()).slice(0, limit);
  const seen = new Set();
  const out = [];
  let tries = limit * 4;
  while (out.length < limit && tries-- > 0) {
    const i = rand(arr.length);
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(arr[i]);
  }
  return out;
}

function collector(excludeName) {
  const seen = new Set([normalize(excludeName)]);
  const picked = [];
  return {
    picked,
    add(name) {
      if (!name) return;
      const n = normalize(name);
      if (seen.has(n)) return;
      seen.add(n);
      picked.push(name);
    },
    get full() {
      return picked.length >= NEED;
    },
  };
}

const scopeSets = new WeakMap();
function scopeSetOf(arr) {
  let s = scopeSets.get(arr);
  if (!s) {
    s = new Set(arr.map(String));
    scopeSets.set(arr, s);
  }
  return s;
}

const setArrays = new WeakMap();
function setToArray(set) {
  let a = setArrays.get(set);
  if (!a) {
    a = [...set];
    setArrays.set(set, a);
  }
  return a;
}

/* ───────── last-resort global names (one cached D1 query) ───────── */

const GLOBAL_TTL_MS = 5 * 60_000;
const globalCache = { name: { t: 0, v: [] }, album_name: { t: 0, v: [] } };

async function globalNames(env, field) {
  const c = globalCache[field];
  if (c.v.length > 0 && Date.now() - c.t < GLOBAL_TTL_MS) return c.v;
  const sql =
    field === 'name'
      ? 'SELECT DISTINCT name AS n FROM tracks ORDER BY RANDOM() LIMIT 60'
      : 'SELECT DISTINCT album_name AS n FROM tracks WHERE album_name IS NOT NULL ORDER BY RANDOM() LIMIT 60';
  try {
    const { results } = await env.DB.prepare(sql).all();
    c.v = (results ?? []).map((r) => r.n).filter(Boolean);
    c.t = Date.now();
  } catch (err) {
    console.warn('global names query failed', err?.message);
  }
  return c.v;
}

async function collectNames(env, artistId, exclude, scopeArtistIds, field) {
  const c = collector(exclude);

  // 1) same artist
  let own = [];
  try {
    const data = await loadArtistData(env, 'core', [artistId]);
    own = data.get(String(artistId))?.t ?? [];
  } catch {
    /* fall through to other tiers */
  }
  for (const r of randomOrder(own, 12)) {
    c.add(r[field]);
    if (c.full) return c.picked.slice(0, NEED);
  }

  // 2) other in-scope artists that are already in memory
  const scope = scopeSetOf(scopeArtistIds);
  const self = String(artistId);
  const loaded = peekLoaded('core').filter((e) => e.id !== self && scope.has(e.id));
  for (let tries = 0; tries < 40 && !c.full && loaded.length > 0; tries++) {
    const t = loaded[rand(loaded.length)].data.t;
    if (t?.length) c.add(t[rand(t.length)][field]);
  }
  if (c.full) return c.picked.slice(0, NEED);

  // 3) whole catalogue (cached)
  const field2 = field === 'name' ? 'name' : 'album_name';
  for (const n of randomOrder(await globalNames(env, field2), 12)) {
    c.add(n);
    if (c.full) break;
  }
  return c.picked.slice(0, NEED);
}

export function trackNameDistractors(env, artistId, excludeName, scopeArtistIds) {
  return collectNames(env, artistId, excludeName, scopeArtistIds, 'name');
}

export function albumNameDistractors(env, artistId, correctAlbumName, scopeArtistIds) {
  return collectNames(env, artistId, correctAlbumName, scopeArtistIds, 'album_name');
}

/* ───────── artists ───────── */

/** Artist row {id, name, genre_ids[]} from the catalog; D1 only if the catalog is cold. */
export async function getArtistRow(env, artistId) {
  const cat = await getCatalogFromKV(env);
  if (cat) {
    const a = buildCatalogIndex(cat).artistsById.get(artistId);
    if (a) {
      return {
        id: a.id,
        name: a.name,
        genre_ids: Array.isArray(a.genre_ids) ? a.genre_ids : safeParseArray(a.genre_ids),
      };
    }
  }
  const row = await env.DB.prepare('SELECT id, name, genre_ids FROM artists WHERE id = ?')
    .bind(artistId)
    .first();
  return row ? { ...row, genre_ids: safeParseArray(row.genre_ids) } : null;
}

/**
 * Tier 0: other artists in scope  -> Tier 1: same genre(s) -> Tier 2: any artist with clips.
 * Uses only the in-memory catalog index (no D1).
 */
export async function artistNameDistractors(env, correctArtist, scopeArtistIds) {
  const cat = await getCatalogFromKV(env);
  if (!cat) {
    // Cold catalog: one small D1 query.
    const { results } = await env.DB.prepare(
      'SELECT id, name FROM artists WHERE tracks_count > 0 AND id != ? ORDER BY RANDOM() LIMIT 12'
    ).bind(correctArtist.id).all();
    const c = collector(correctArtist.name);
    for (const r of results ?? []) {
      c.add(r.name);
      if (c.full) break;
    }
    return shuffle(c.picked.slice(0, NEED));
  }

  const idx = buildCatalogIndex(cat);
  const picked = [];
  const seenIds = new Set([correctArtist.id]);
  const seenNames = new Set([normalize(correctArtist.name)]);

  const push = (id) => {
    if (id == null || seenIds.has(id)) return;
    const a = idx.artistsById.get(id);
    if (!a?.name || (a.tracks_count ?? 0) <= 0) return;
    const n = normalize(a.name);
    if (seenNames.has(n)) return;
    seenIds.add(id);
    seenNames.add(n);
    picked.push(a.name);
  };

  for (const id of randomOrder(scopeArtistIds, 12)) {
    if (picked.length >= NEED) break;
    push(id);
  }

  if (picked.length < NEED) {
    const genreIds = Array.isArray(correctArtist.genre_ids)
      ? correctArtist.genre_ids
      : safeParseArray(correctArtist.genre_ids);
    for (const g of genreIds) {
      const set = idx.artistsByGenre.get(g);
      if (!set) continue;
      for (const id of randomOrder(setToArray(set), 8)) {
        if (picked.length >= NEED) break;
        push(id);
      }
      if (picked.length >= NEED) break;
    }
  }

  if (picked.length < NEED) {
    for (const id of randomOrder(idx.artistsWithClips, 12)) {
      if (picked.length >= NEED) break;
      push(id);
    }
  }

  return shuffle(picked.slice(0, NEED));
}