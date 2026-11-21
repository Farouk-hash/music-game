// src/lib/cache/pool.js
//
// Per-artist pool stored in KV (free-tier friendly):
//   pool:v2:core:{artistId} -> { t: tracks[], i: instruments[], y: {album: year}, s: snippets[] }
//   pool:v2:lyr:{artistId}  -> lyric rows (full text, only for traditional lyrics rounds)
//
// A request only loads the artists it needs, so JSON.parse cost stays tiny.
// Only RESOLVED values are memoized (never pending promises), because sharing
// a pending I/O promise between requests can fail in Workers.

import { normalize } from '../../utilities/normalize.js';
import { extractMiddleSnippet } from '../../controllers/game/rounds-methods/lyric-snippets.js';

const PREFIX = { core: 'pool:v2:core:', lyr: 'pool:v2:lyr:' };
const MEMO_TTL_MS = 60_000;
const MEMO_MAX = 300;
const IN_CHUNK = 20; // D1 bind-parameter safety
const EMPTY = Object.freeze([]);

export class PoolNotReady extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'PoolNotReady';
  }
}

/* ─────────────── in-isolate memo (resolved values only) ─────────────── */

const memo = new Map(); // key -> { t, value }

const keyOf = (kind, id) => `${PREFIX[kind]}${id}`;
const isFresh = (e, now = Date.now()) => e && now - e.t < MEMO_TTL_MS;

function remember(key, value) {
  if (memo.size >= MEMO_MAX) {
    const now = Date.now();
    for (const [k, e] of memo) if (!isFresh(e, now)) memo.delete(k);
    if (memo.size >= MEMO_MAX) memo.clear();
  }
  memo.set(key, { t: Date.now(), value });
}

async function readOne(env, kind, id) {
  const key = keyOf(kind, id);
  const hit = memo.get(key);
  if (isFresh(hit)) return hit.value;
  let value = null;
  try {
    value = await env.CATALOG_CACHE.get(key, { type: 'json', cacheTtl: 60 });
  } catch (err) {
    console.warn('pool read failed', key, err?.message);
  }
  if (value != null) remember(key, value);
  return value;
}

/**
 * Load per-artist data. Returns Map<String(artistId), data>.
 *   kind 'core': { t, i, y, s }  (artists with no key are skipped; throws
 *                PoolNotReady only if NONE of the requested artists exist)
 *   kind 'lyr' : array of lyric rows (missing key => empty array)
 */
export async function loadArtistData(env, kind, artistIds) {
  if (!env.CATALOG_CACHE) throw new PoolNotReady('CATALOG_CACHE binding missing');
  const ids = [...new Set(artistIds.map(String))];
  const out = new Map();
  await Promise.all(
    ids.map(async (id) => {
      const v = await readOne(env, kind, id);
      if (v != null) out.set(id, v);
      else if (kind === 'lyr') out.set(id, EMPTY);
    })
  );
  if (kind === 'core' && ids.length > 0 && out.size === 0) {
    throw new PoolNotReady('Pool cache is empty for the requested artists');
  }
  return out;
}

/**
 * Synchronous peek at everything already in memory (fresh entries only).
 * Used by distractor code so it never triggers extra KV reads.
 * Returns [{ id: 'artistId', data }].
 */
export function peekLoaded(kind) {
  const prefix = PREFIX[kind];
  const now = Date.now();
  const out = [];
  for (const [k, e] of memo) {
    if (!k.startsWith(prefix) || !isFresh(e, now)) continue;
    out.push({ id: k.slice(prefix.length), data: e.value });
  }
  return out;
}

/* ─────────────── building (run from the invalidate endpoint) ─────────────── */

/**
 * Rebuild the pool for a list of artists (<= ~20 per call is comfortable).
 */
export async function buildPoolForArtists(env, ids) {
  if (!ids.length) return;
  const ph = ids.map(() => '?').join(',');

  const [tracksRes, instrRes, yearsRes, lyricsRes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, artist_id, r2_key, r2_reversed_key, position,
              album_name, featured_artists
         FROM tracks
        WHERE artist_id IN (${ph})
          AND (r2_key IS NOT NULL OR r2_reversed_key IS NOT NULL)`
    ).bind(...ids).all(),

    env.DB.prepare(
      `WITH ranked AS (
         SELECT i.id, i.artist_id, i.track_name, i.position, i.r2_key, i.album_name,
                ROW_NUMBER() OVER (PARTITION BY i.artist_id, i.track_name ORDER BY i.id) AS rn
           FROM instruments i
          WHERE i.artist_id IN (${ph})
       )
       SELECT r.id, r.artist_id, r.track_name AS name, r.position,
              r.r2_key, r.album_name, t.featured_artists
         FROM ranked r
         LEFT JOIN tracks t ON t.artist_id = r.artist_id AND t.name = r.track_name
        WHERE r.rn = 1`
    ).bind(...ids).all(),

    env.DB.prepare(
      `SELECT released_year, artist_id, album_name
         FROM album_years WHERE artist_id IN (${ph})`
    ).bind(...ids).all(),

    env.DB.prepare(
      `SELECT l.id, l.artist_id, l.track_name, l.lyrics,
              a.name AS artist_name,
              (SELECT t.album_name FROM tracks t
                WHERE t.artist_id = l.artist_id AND t.name = l.track_name LIMIT 1) AS album_name,
              (SELECT t.r2_key FROM tracks t
                WHERE t.artist_id = l.artist_id AND t.name = l.track_name
                  AND t.r2_key IS NOT NULL LIMIT 1) AS reveal_r2_key
         FROM lyrics l
         JOIN artists a ON a.id = l.artist_id
        WHERE l.artist_id IN (${ph})
          AND l.lyrics IS NOT NULL AND length(l.lyrics) >= 200`
    ).bind(...ids).all(),
  ]);

  const core = {};
  const lyr = {};
  for (const id of ids) {
    core[id] = { t: [], i: [], y: {}, s: [] };
    lyr[id] = [];
  }

  for (const r of tracksRes.results ?? []) {
    core[r.artist_id]?.t.push({
      id: r.id, name: r.name, artist_id: r.artist_id,
      r2_key: r.r2_key, r2_reversed_key: r.r2_reversed_key,
      position: r.position, album_name: r.album_name,
      featured_artists: r.featured_artists,
    });
  }
  for (const r of instrRes.results ?? []) {
    core[r.artist_id]?.i.push({
      id: r.id, artist_id: r.artist_id, name: r.name, position: r.position,
      r2_key: r.r2_key, album_name: r.album_name,
      featured_artists: r.featured_artists,
    });
  }
  for (const r of yearsRes.results ?? []) {
    const c = core[r.artist_id];
    if (c && c.y[r.album_name] == null) c.y[r.album_name] = r.released_year;
  }
  for (const r of lyricsRes.results ?? []) {
    lyr[r.artist_id]?.push(r);
    // Precompute the snippet once, so instrumental rounds never touch full lyrics.
    const snippet = extractMiddleSnippet(r.lyrics);
    if (snippet) {
      core[r.artist_id]?.s.push({
        artist_id: r.artist_id,
        track_name: r.track_name,
        snippet,
        normalized: normalize(snippet),
      });
    }
  }

  await Promise.all(
    ids.flatMap((id) => [
      env.CATALOG_CACHE.put(keyOf('core', id), JSON.stringify(core[id])),
      env.CATALOG_CACHE.put(keyOf('lyr', id), JSON.stringify(lyr[id])),
    ])
  );
}

/**
 * Rebuild the pool, optionally in pages so each invocation stays small:
 *   buildAndStorePools(env)                         -> everything (old behaviour)
 *   buildAndStorePools(env, { offset: 0, limit: 25 }) -> one page; repeat with nextOffset until done
 */
export async function buildAndStorePools(env, { offset = 0, limit = Infinity } = {}) {
  if (!env.CATALOG_CACHE) throw new Error('CATALOG_CACHE binding missing');
  const started = Date.now();

  const { results } = await env.DB.prepare(
    `SELECT DISTINCT artist_id AS id FROM (
       SELECT artist_id FROM tracks WHERE r2_key IS NOT NULL OR r2_reversed_key IS NOT NULL
       UNION SELECT artist_id FROM instruments
       UNION SELECT artist_id FROM lyrics WHERE lyrics IS NOT NULL AND length(lyrics) >= 200
     ) ORDER BY id`
  ).all();

  const all = (results ?? []).map((r) => r.id);
  const end = Number.isFinite(limit) ? offset + limit : all.length;
  const slice = all.slice(offset, end);

  for (let i = 0; i < slice.length; i += IN_CHUNK) {
    await buildPoolForArtists(env, slice.slice(i, i + IN_CHUNK));
  }
  memo.clear();

  const nextOffset = offset + slice.length;
  return {
    ok: true,
    totalArtists: all.length,
    built: slice.length,
    nextOffset,
    done: nextOffset >= all.length,
    durationMs: Date.now() - started,
  };
}

/**
 * Delete pool keys (v2 and legacy v1). NOTE: until you rebuild, /game/round
 * answers 503. Prefer just re-running buildAndStorePools, which overwrites.
 */
export async function invalidatePools(env /* , ctx, originUrl */) {
  memo.clear();
  if (!env.CATALOG_CACHE) return;
  const prefixes = ['pool:v2:', 'pool:tracks:', 'pool:instruments:', 'pool:lyrics:', 'pool:albumyears:'];
  for (const prefix of prefixes) {
    let cursor;
    do {
      const list = await env.CATALOG_CACHE.list({ prefix, cursor });
      await Promise.all((list.keys ?? []).map((k) => env.CATALOG_CACHE.delete(k.name).catch(() => {})));
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
  }
}