#!/usr/bin/env node
/**
 * Album-years pipeline orchestrator.
 *
 * Input (from argv, one of):
 *   --pairs-file=<path>   JSON file: [{ artist_id, album_names: [...] }, ...]
 *   --pairs=<json>        Same JSON, inline (kept for quick ad-hoc tests)
 *
 * Flow:
 *   For each { artist_id, album_names }:
 *     1. Fetch matb3aa albums once (skipped for source=albumaty & id>=90000)
 *     2. Resolve albumaty singer once (by artist name)
 *     3. For each album_name, run the fallback chain
 *     4. Collect resolved { artist_id, album_name, released_year }
 *   Then POST to Worker /album-years/bulk in batches of 200.
 *
 * Progress lines (stdout, one JSON per line):
 *   {"stage":"albumaty-index","done":1,"total":1}
 *   {"stage":"resolve","done":N,"total":M}
 *   {"stage":"bulk-insert","done":N,"total":M}
 *   {"stage":"done","status":"done","summary":{...}}
 *
 * Non-JSON lines go to the log.
 */

import {  readFile } from 'node:fs/promises';


/* ═══════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════ */

const MATB3AA_BASE = 'https://www.matb3aa.com';
const ALBUMATY_BASE = 'https://www.albumaty.com';
const WORKER_BASE = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

const BULK_BATCH_SIZE = 200;
const CONCURRENCY = 3;
const REQUEST_DELAY = 250;

const MATB3AA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.matb3aa.com/',
  'Origin':  'https://www.matb3aa.com',
  'Accept':  'application/json',
};

const ALBUMATY_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'ar,en;q=0.9',
};

/* ═══════════════════════════════════════════════════════════
   Progress helpers (same protocol as lyrics run.js)
   ═══════════════════════════════════════════════════════════ */

function emit(payload) { process.stdout.write(JSON.stringify(payload) + '\n'); }
function log(msg)      { process.stdout.write(String(msg) + '\n'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════
   Arabic / album-name helpers (identical to backfill script)
   ═══════════════════════════════════════════════════════════ */

function normalizeArabic(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/[\u0649\u0626]/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30))
    .replace(/[^\p{L}\p{Nd}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAlbumPrefix(s) {
  return String(s || '').replace(/^(?:ال)?[اأ]لبوم\s+/, '').trim();
}
function hasAlbumPrefix(name) {
  return /^(?:ال)?[اأ]لبوم\s/.test(String(name || ''));
}
function cleanKey(name) { return normalizeArabic(stripAlbumPrefix(name)); }
function rawKey(name)   { return normalizeArabic(name); }

/* ═══════════════════════════════════════════════════════════
   matb3aa
   ═══════════════════════════════════════════════════════════ */

function yearFromIso(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-/);
  return m ? Number(m[1]) : null;
}

async function matb3aaAlbumsForArtist(artistId) {
  const albums = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${MATB3AA_BASE}/api/v1/artists/${artistId}/albums?perPage=100&page=${page}`;
    let j;
    try {
      const res = await fetch(url, { headers: MATB3AA_HEADERS });
      if (!res.ok) break;
      j = await res.json();
    } catch { break; }
    const items = j?.pagination?.data ?? [];
    if (!items.length) break;
    albums.push(...items);
    if (!j?.pagination?.next_page) break;
    await sleep(200);
  }
  return albums;
}

function buildMatb3aaMap(albums) {
  const map = new Map();
  for (const a of albums) {
    const year = yearFromIso(a.release_date);
    const value = { name: a.name, year };
    const ck = cleanKey(a.name);
    const rk = rawKey(a.name);
    if (ck && !map.has(ck)) map.set(ck, value);
    if (rk && rk !== ck && !map.has(rk)) map.set(rk, value);
  }
  return map;
}

/* ═══════════════════════════════════════════════════════════
   albumaty
   ═══════════════════════════════════════════════════════════ */

function extractYearFromText(s) {
  if (!s) return null;
  const west = String(s)
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30));
  const m = west.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function parseAlbumatyAlbums(html) {
  const albums = [];
  const block = html.match(/<div class="singer-albums">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (!block) return albums;
  const items = [...block[1].matchAll(
    /<li[^>]*>\s*<a href="(https:\/\/www\.albumaty\.com\/album\/(\d+)\.html)">([\s\S]*?)<\/a>\s*<\/li>/g
  )];
  for (const m of items) {
    const raw = m[3];
    const yearMatch = raw.match(/<small>\s*([^<]+?)\s*<\/small>/);
    const year = extractYearFromText(yearMatch ? yearMatch[1] : null);
    const titleHtml = raw.replace(/<img[^>]*>/g, '').replace(/<small[^>]*>[^<]*<\/small>/g, '');
    const title = titleHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    albums.push({ id: Number(m[2]), title, year });
  }
  return albums;
}

async function fetchAlbumatySingerAlbums(singerId) {
  const url = `${ALBUMATY_BASE}/singer/${singerId}.html`;
  const res = await fetch(url, { headers: ALBUMATY_HEADERS });
  if (!res.ok) return [];
  const html = await res.text();
  return parseAlbumatyAlbums(html);
}

function buildAlbumatyMap(albums) {
  const map = new Map();
  for (const a of albums) {
    const value = { name: a.title, year: a.year };
    const ck = cleanKey(a.title);
    const rk = rawKey(a.title);
    if (ck && !map.has(ck)) map.set(ck, value);
    if (rk && rk !== ck && !map.has(rk)) map.set(rk, value);
  }
  return map;
}

let singersCache = null;
async function loadAlbumatySingers() {
  if (singersCache) return singersCache;
  const map = new Map();
  for (const cat of [1, 2, 3]) {
    const url = `${ALBUMATY_BASE}/cat/${cat}.html`;
    try {
      const res = await fetch(url, { headers: ALBUMATY_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      const items = [...html.matchAll(
        /<div class="country-singers">\s*<a href="(https:\/\/www\.albumaty\.com\/singer\/(\d+)\.html)">([\s\S]*?)<\/a>/g
      )];
      for (const m of items) {
        const id = Number(m[2]);
        const name = m[3]
          .replace(/<[^>]+>/g, '')
          .replace(/^اغاني\s+/, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!name) continue;
        const key = normalizeArabic(name);
        if (!map.has(key)) map.set(key, { id, name });
      }
    } catch { /* skip cat */ }
    await sleep(300);
  }
  singersCache = map;
  return map;
}

function findAlbumatySinger(singers, artistName) {
  const target = normalizeArabic(artistName);
  if (!target) return null;
  const exact = singers.get(target);
  if (exact) return { ...exact, matchType: 'exact' };
  let best = null;
  for (const [key, val] of singers) {
    if (key.includes(target) || target.includes(key)) {
      const score = Math.abs(key.length - target.length);
      if (!best || score < best.score) best = { ...val, key, score };
    }
  }
  return best ? { id: best.id, name: best.name, matchType: 'fuzzy' } : null;
}

/* ═══════════════════════════════════════════════════════════
   Resolver (same chain as backfill script)
   ═══════════════════════════════════════════════════════════ */

function resolveAlbumYear(d1Album, matb3aaMap, albumatyMap, allowMatb3aa) {
  const prefixed = hasAlbumPrefix(d1Album);
  const stripped = stripAlbumPrefix(d1Album);

  const tryMap = (map, key) => {
    if (!map) return null;
    const hit = map.get(key);
    return hit?.year ? { year: hit.year, matchedName: hit.name } : null;
  };

  if (prefixed) {
    if (allowMatb3aa) {
      let r = tryMap(matb3aaMap, cleanKey(stripped));
      if (r) return { ...r, source: 'matb3aa' };
      r = tryMap(matb3aaMap, rawKey(d1Album));
      if (r) return { ...r, source: 'matb3aa-raw' };
    }
    let r = tryMap(albumatyMap, cleanKey(stripped));
    if (r) return { ...r, source: 'albumaty' };
    r = tryMap(albumatyMap, rawKey(d1Album));
    if (r) return { ...r, source: 'albumaty-raw' };
    r = tryMap(albumatyMap, cleanKey(`ألبوم ${stripped}`));
    if (r) return { ...r, source: 'albumaty+ألبوم' };
    r = tryMap(albumatyMap, cleanKey(`البوم ${stripped}`));
    if (r) return { ...r, source: 'albumaty+البوم' };
  } else {
    let r = tryMap(albumatyMap, rawKey(d1Album));
    if (r) return { ...r, source: 'albumaty-raw' };
    r = tryMap(albumatyMap, cleanKey(d1Album));
    if (r) return { ...r, source: 'albumaty' };
    r = tryMap(albumatyMap, cleanKey(`ألبوم ${d1Album}`));
    if (r) return { ...r, source: 'albumaty+ألبوم' };
    r = tryMap(albumatyMap, cleanKey(`البوم ${d1Album}`));
    if (r) return { ...r, source: 'albumaty+البوم' };

    if (allowMatb3aa) {
      r = tryMap(matb3aaMap, rawKey(d1Album));
      if (r) return { ...r, source: 'matb3aa-raw' };
      r = tryMap(matb3aaMap, cleanKey(d1Album));
      if (r) return { ...r, source: 'matb3aa' };
      r = tryMap(matb3aaMap, cleanKey(`البوم ${d1Album}`));
      if (r) return { ...r, source: 'matb3aa+البوم' };
      r = tryMap(matb3aaMap, cleanKey(`ألبوم ${d1Album}`));
      if (r) return { ...r, source: 'matb3aa+ألبوم' };
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   Worker writeback
   ═══════════════════════════════════════════════════════════ */

async function bulkInsertToWorker(items) {
  const res = await fetch(`${WORKER_BASE}/album-years/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`bulk insert ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--pairs-file='));
  const inlineArg = args.find(a => a.startsWith('--pairs='));

  let pairs;
  if (fileArg) {
    const path = fileArg.slice('--pairs-file='.length);
    pairs = JSON.parse(await readFile(path, 'utf8'));
  } else if (inlineArg) {
    pairs = JSON.parse(inlineArg.slice('--pairs='.length));
  } else {
    emit({ stage: 'failed', status: 'failed', error: 'Provide --pairs-file or --pairs' });
    process.exit(1);
  }

  if (!Array.isArray(pairs) || pairs.length === 0) {
    emit({ stage: 'failed', status: 'failed', error: 'pairs must be a non-empty array' });
    process.exit(1);
  }

  // Limit: 400 artists, 10000 pairs (matches server-side guard).
  // These are sanity rails, not workflow limits — the catalogue is well
  // under 400 artists, so in practice the guard is unreachable.
  const artistCount = pairs.length;
  const totalPairs = pairs.reduce((n, p) => n + (Array.isArray(p.album_names) ? p.album_names.length : 0), 0);
  log(`Scope: ${artistCount} artists, ${totalPairs} album-name pairs`);

  if (artistCount > 400) {
    emit({ stage: 'failed', status: 'failed', error: `Too many artists: ${artistCount} > 400` });
    process.exit(1);
  }
  if (totalPairs > 10000) {
    emit({ stage: 'failed', status: 'failed', error: `Too many pairs: ${totalPairs} > 10000` });
    process.exit(1);
  }

  /* ── Stage 1: load albumaty index ── */
  log('Stage: albumaty-index');
  emit({ stage: 'albumaty-index', done: 0, total: 1 });
  const albumatySingers = await loadAlbumatySingers();
  log(`  ${albumatySingers.size} albumaty singers indexed`);
  emit({ stage: 'albumaty-index', done: 1, total: 1 });

  /* ── Stage 2: resolve ── */
  log('Stage: resolve');
  emit({ stage: 'resolve', done: 0, total: totalPairs });

  const resolved = [];
  const misses = [];
  let done = 0;

  for (const entry of pairs) {
    const artistId = Number(entry.artist_id);
    const artistName = String(entry.artist_name ?? '');
    const albumNames = Array.isArray(entry.album_names) ? entry.album_names : [];

    if (!Number.isInteger(artistId) || artistId <= 0 || albumNames.length === 0) {
      log(`  skipping invalid artist entry: ${JSON.stringify(entry).slice(0, 80)}`);
      done += albumNames.length;
      emit({ stage: 'resolve', done, total: totalPairs });
      continue;
    }

    const allowMatb3aa = artistId < 90000;

    const matb3aaMap = new Map();
    if (allowMatb3aa) {
      try {
        const albums = await matb3aaAlbumsForArtist(artistId);
        for (const [k, v] of buildMatb3aaMap(albums)) matb3aaMap.set(k, v);
      } catch { /* ignore */ }
    }

    const albumatyMap = new Map();
    const singer = findAlbumatySinger(albumatySingers, artistName);
    if (singer) {
      try {
        const albums = await fetchAlbumatySingerAlbums(singer.id);
        for (const [k, v] of buildAlbumatyMap(albums)) albumatyMap.set(k, v);
      } catch { /* ignore */ }
    }

    for (const albumName of albumNames) {
      const hit = resolveAlbumYear(albumName, matb3aaMap, albumatyMap, allowMatb3aa);
      if (hit) {
        resolved.push({
          artist_id: artistId,
          album_name: albumName,
          released_year: hit.year,
          source: hit.source,
        });
      } else {
        misses.push({ artist_id: artistId, album_name: albumName });
      }
      done++;
      if (done % 5 === 0 || done === totalPairs) {
        emit({ stage: 'resolve', done, total: totalPairs });
      }
    }
  }

  log(`  resolved: ${resolved.length}/${totalPairs}`);

  /* ── Stage 3: bulk insert ── */
  log('Stage: bulk-insert');
  emit({ stage: 'bulk-insert', done: 0, total: resolved.length });

  let inserted = 0, updated = 0, skipped = 0, errors = 0;
  for (let i = 0; i < resolved.length; i += BULK_BATCH_SIZE) {
    const batch = resolved.slice(i, i + BULK_BATCH_SIZE).map(r => ({
      artist_id: r.artist_id,
      album_name: r.album_name,
      released_year: r.released_year,
    }));
    try {
      const res = await bulkInsertToWorker(batch);
      inserted += res?.inserted ?? 0;
      updated  += res?.updated  ?? 0;
      skipped  += res?.skipped  ?? 0;
      errors   += Array.isArray(res?.errors) ? res.errors.length : 0;
    } catch (e) {
      log(`  bulk batch ${Math.floor(i / BULK_BATCH_SIZE) + 1} failed: ${e.message}`);
      errors += batch.length;
    }
    emit({ stage: 'bulk-insert', done: Math.min(i + BULK_BATCH_SIZE, resolved.length), total: resolved.length });
  }

  /* ── Done ── */
  const summary = {
    artists: artistCount,
    pairsTotal: totalPairs,
    resolved: resolved.length,
    unresolved: misses.length,
    inserted,
    updated,
    skipped,
    errors,
  };

  log('');
  log('════════════════ Summary ════════════');
  log(`Artists in scope   : ${artistCount}`);
  log(`Album pairs        : ${totalPairs}`);
  log(`Resolved           : ${resolved.length}`);
  log(`Unresolved         : ${misses.length}`);
  log(`Inserted           : ${inserted}`);
  log(`Updated            : ${updated}`);
  log(`Errors             : ${errors}`);

  emit({ stage: 'done', status: 'done', summary });
}

main().catch(err => {
  emit({ stage: 'failed', status: 'failed', error: err.message });
  process.exit(1);
});