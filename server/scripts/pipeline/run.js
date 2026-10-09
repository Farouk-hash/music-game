#!/usr/bin/env node
/**
 * Pipeline orchestrator.
 *
 * One entry point that runs the whole lyrics workflow:
 *   dump D1 → matb3aa search → matb3aa fetch → lyrics.nu match
 *   → lyrics.nu fetch → compare → bulk upsert to D1
 *
 * Emits JSON progress lines to stdout so the Express parent can
 * parse them and update its job record. Non-JSON lines pass through
 * as human-readable log output.
 *
 * Usage:
 *   node run.js --artist=65
 *   node run.js --artists=65,9,42
 *   node run.js --missing-only
 *
 * Progress line shape:
 *   {"stage":"matb3aa-search","done":25,"total":275}
 *   {"stage":"compare","done":1,"total":1}
 *   {"stage":"done","status":"done","summary":{...}}
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ═══════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════ */

const MATB3AA_BASE   = 'https://www.matb3aa.com';
const LYRICS_BASE    = 'https://lyrics.nu';
const WORKER_BASE    = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';
const MATB3AA_DB     = 'music-game-db';
const WRANGLER_CWD   = 'E:\\matb3aa-game\\music-game-wrangler';

const MATB3AA_MIN_CHARS = 100;
const BULK_BATCH_SIZE   = 200;
const CONCURRENCY       = 4;
const REQUEST_DELAY     = 400;
const MAX_RETRIES       = 3;

const MATB3AA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.matb3aa.com/',
  'Origin':  'https://www.matb3aa.com',
  'Accept':  'application/json, text/plain, */*',
};

const LYRICS_NU_HEADERS = {
  'User-Agent': 'matb3aa-game-lyrics-fetcher/0.1',
};

/* ═══════════════════════════════════════════════════════════
   Progress reporting
   ═══════════════════════════════════════════════════════════ */

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function log(msg) {
  process.stdout.write(String(msg) + '\n');
}

/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchJson(url, headers, { retries = MAX_RETRIES, delay = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const text = await res.text();
        try { return JSON.parse(text); } catch { return null; }
      }
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(delay * Math.pow(2, attempt));
        continue;
      }
      return null;
    } catch {
      if (attempt === retries) return null;
      await sleep(delay * Math.pow(2, attempt));
    }
  }
  return null;
}

async function fetchText(url, headers, { retries = MAX_RETRIES, delay = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(delay * Math.pow(2, attempt));
        continue;
      }
      return null;
    } catch {
      if (attempt === retries) return null;
      await sleep(delay * Math.pow(2, attempt));
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   Arabic normalizer (identical to the existing scripts)
   ═══════════════════════════════════════════════════════════ */

function normalizeArabic(input) {
  if (!input) return '';
  let s = String(input);
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  s = s.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');
  s = s.replace(/[\u064B-\u065F\u0670]/g, '');
  s = s.replace(/\u0640/g, '');
  s = s.replace(/[\u0622\u0623\u0625]/g, '\u0627');
  s = s.replace(/[\u0649\u0626]/g, '\u064A');
  s = s.replace(/\u0629/g, '\u0647');
  s = s.replace(/[^\p{L}\p{Nd}]+/gu, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^\u0627\u063A\u0646\u064A\u0647?\s+/, '');
  return s.trim();
}

function levenshtein(a, b) {
  const lenA = a.length, lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  let prev = new Array(lenB + 1);
  let curr = new Array(lenB + 1);
  for (let j = 0; j <= lenB; j++) prev[j] = j;
  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1;
      const ins = curr[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lenB];
}

/* ═══════════════════════════════════════════════════════════
   D1 dump (via wrangler subprocess)
   ═══════════════════════════════════════════════════════════ */

function wranglerJson(sql) {
  return new Promise((resolve, reject) => {
    const cmd = `npx wrangler d1 execute ${MATB3AA_DB} --remote --json --command="${sql.replace(/"/g, '\\"')}"`;

    const child = spawn(cmd, [], {
      cwd: WRANGLER_CWD,
      shell: true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('exit', code => {
      if (code !== 0) {
        return reject(new Error(`wrangler exit ${code}: ${stderr.slice(0, 400)}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        const rows = Array.isArray(parsed) ? (parsed[0]?.results ?? []) : (parsed.results ?? []);
        resolve(rows);
      } catch (e) {
        reject(new Error(`wrangler JSON parse failed: ${e.message}\nFirst 200 chars: ${stdout.slice(0, 200)}`));
      }
    });
    child.on('error', reject);
  });
}

async function dumpD1() {
  emit({ stage: 'dump', done: 0, total: 3 });
  const artists = await wranglerJson(
    'SELECT id AS artist_id, name AS artist_name FROM artists WHERE tracks_count > 0 ORDER BY name'
  );
  emit({ stage: 'dump', done: 1, total: 3 });
  const tracks = await wranglerJson(
    'SELECT DISTINCT artist_id, name AS track_name FROM tracks WHERE r2_key IS NOT NULL'
  );
  emit({ stage: 'dump', done: 2, total: 3 });
  const existingLyrics = await wranglerJson(
    "SELECT artist_id, track_name FROM lyrics WHERE lyrics IS NOT NULL AND lyrics != ''"
  );
  emit({ stage: 'dump', done: 3, total: 3 });
  return { artists, tracks, existingLyrics };
}

/* ═══════════════════════════════════════════════════════════
   matb3aa search
   ═══════════════════════════════════════════════════════════ */

async function matb3aaSarchTrack(trackName, artistId) {
  const q = encodeURIComponent(trackName);
  let url = `${MATB3AA_BASE}/api/v1/search?query=${q}&loader=searchPage`;

  for (let page = 1; page <= 3; page++) {
    const data = await fetchJson(url, MATB3AA_HEADERS);
    if (!data) return { matched: false, reason: 'fetch-failed' };
    const rows = data?.results?.tracks?.data ?? [];

    for (const t of rows) {
      if (t.name !== trackName) continue;
      const ids = (t.artists ?? []).map(a => a.id);
      if (ids.includes(artistId)) {
        return {
          matched: true,
          matb3aaId: t.id,
          matb3aaName: t.name,
          albumName: t.album?.name ?? null,
        };
      }
    }

    const nextPage = data?.results?.tracks?.next_page;
    if (!nextPage) break;
    url = `${MATB3AA_BASE}/api/v1/search?query=${q}&loader=searchPage&page=${nextPage}`;
    await sleep(REQUEST_DELAY);
  }
  return { matched: false, reason: 'no-exact-match' };
}

/* ═══════════════════════════════════════════════════════════
   matb3aa fetch lyrics
   ═══════════════════════════════════════════════════════════ */

async function matb3aaFetchLyrics(matb3aaId) {
  const url = `${MATB3AA_BASE}/api/v1/tracks/${matb3aaId}/lyrics?duration=0`;
  const data = await fetchJson(url, MATB3AA_HEADERS);
  if (!data) return { ok: false, error: 'fetch-failed' };

  const lines = Array.isArray(data.lines) ? data.lines : [];
  if (lines.length === 0) return { ok: false, error: 'no-lyrics' };

  const text = lines
    .map(l => (l && typeof l.text === 'string') ? l.text : '')
    .join('\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return { ok: false, error: 'empty-lyrics' };

  return {
    ok: true,
    lyrics: text,
    bytes: Buffer.byteLength(text, 'utf8'),
    charCount: text.length,
    isSynced: !!data.is_synced,
    lineCount: lines.length,
  };
}

/* ═══════════════════════════════════════════════════════════
   lyrics.nu helpers
   ═══════════════════════════════════════════════════════════ */

async function lyricsNuFetchSingerSongs(singerSlug) {
  const base = `${LYRICS_BASE}/singer/${encodeURIComponent(singerSlug)}/`;
  const urls = new Set();
  for (let page = 1; page <= 30; page++) {
    const url = page === 1 ? base : `${base}page/${page}/`;
    const html = await fetchText(url, LYRICS_NU_HEADERS);
    if (!html) break;
    const before = urls.size;
    for (const m of html.matchAll(/href="(https:\/\/lyrics\.nu\/kalimat-aghani\/[^"]+)"/g)) {
      urls.add(m[1]);
    }
    if (urls.size === before && page > 1) break;
    await sleep(REQUEST_DELAY);
  }
  return [...urls];
}

function songSlugFromUrl(url) {
  const m = url.match(/\/kalimat-aghani\/([^/]+)\//);
  return m ? m[1] : null;
}

function artistPartFromSlug(slugDecoded) {
  const parts = slugDecoded.split('-');
  return parts.slice(2).join(' ');
}

async function lyricsNuFetchLetterIndex(letter) {
  const url = `${LYRICS_BASE}/singers-names-that-start-with/${encodeURIComponent(letter)}/`;
  const html = await fetchText(url, LYRICS_NU_HEADERS);
  if (!html) return [];
  const seen = new Set();
  const links = [];
  for (const m of html.matchAll(/href="(https:\/\/lyrics\.nu\/singer\/([^"]+)\/)"/g)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    links.push({ url: m[1], slugEncoded: m[2] });
  }
  return links;
}

async function lyricsNuResolveArtistSlug(artistName, cache) {
  if (cache.has(artistName)) return cache.get(artistName);
  const normTarget = normalizeArabic(artistName);
  if (!normTarget) {
    const out = { found: false, reason: 'empty-after-normalize' };
    cache.set(artistName, out);
    return out;
  }
  const links = await lyricsNuFetchLetterIndex(normTarget[0]);
  if (links.length === 0) {
    const out = { found: false, reason: 'letter-index-empty' };
    cache.set(artistName, out);
    return out;
  }
  const candidates = links.map(c => {
    let decoded = c.slugEncoded;
    try { decoded = decodeURIComponent(c.slugEncoded); } catch { /* keep */ }
    return { url: c.url, slugDecoded: decoded, slugArtistNorm: normalizeArabic(artistPartFromSlug(decoded)) };
  });

  for (const c of candidates) {
    if (c.slugArtistNorm === normTarget) {
      const out = { found: true, slug: c.slugDecoded, url: c.url };
      cache.set(artistName, out);
      return out;
    }
  }

  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(normTarget, c.slugArtistNorm);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (bestDist <= 2 && best) {
    const out = { found: true, slug: best.slugDecoded, url: best.url };
    cache.set(artistName, out);
    return out;
  }

  const out = { found: false, reason: 'no-match-in-letter-index' };
  cache.set(artistName, out);
  return out;
}

function lyricsNuMatchTrack(rawName, slugMap, slugKeys) {
  const norm = normalizeArabic(rawName);
  if (!norm) return null;
  if (slugMap.has(norm)) return { url: slugMap.get(norm), tier: 'EXACT' };

  let bestKey = null, bestDist = Infinity;
  for (const k of slugKeys) {
    if (Math.abs(k.length - norm.length) > 3) continue;
    const d = levenshtein(norm, k);
    if (d < bestDist) { bestDist = d; bestKey = k; }
    if (d === 0) break;
  }
  if (bestDist <= 2 && bestKey) return { url: slugMap.get(bestKey), tier: `FUZZY(d=${bestDist})` };

  const words = norm.split(' ');
  if (words.length >= 3) {
    for (let take = words.length - 1; take >= 2; take--) {
      const prefix = words.slice(0, take).join(' ');
      if (slugMap.has(prefix)) return { url: slugMap.get(prefix), tier: 'SUFFIX' };
    }
    for (let take = words.length - 1; take >= 2; take--) {
      const prefix = words.slice(0, take).join(' ');
      if (prefix.length < 6) continue;
      for (const k of slugKeys) {
        if (k.length < 6) continue;
        if (Math.abs(k.length - prefix.length) > 2) continue;
        const d = levenshtein(prefix, k);
        if (d <= 2) return { url: slugMap.get(k), tier: `SUFFIX+FUZZY(d=${d})` };
      }
    }
  }

  if (norm.length >= 3) {
    for (const k of slugKeys) {
      if (k.length < 3 || k === norm) continue;
      if (k.includes(norm) || norm.includes(k)) return { url: slugMap.get(k), tier: 'CONTAIN' };
    }
  }
  return null;
}

function extractLyricsFromHtml(html) {
  if (!html) return null;
  const m = /<section\s+class="w3-container w3-margin-bottom">([\s\S]*?)<\/section>/i.exec(html);
  if (!m) return null;
  let body = m[1];
  body = body.replace(/<br\s*\/?>/gi, '\n');
  body = body.replace(/<[^>]+>/g, '');
  body = decodeHtmlEntities(body);
  body = body.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  body = body.split('\n').map(l => l.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, '')).join('\n').trim();
  if (!body) return null;
  return { lyrics: body, bytes: Buffer.byteLength(body, 'utf8'), charCount: body.length };
}

const HTML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&laquo;': '«', '&raquo;': '»',
};
function decodeHtmlEntities(s) {
  s = s.replace(/&[a-z#0-9]+;/gi, ent => HTML_ENTITIES[ent.toLowerCase()] ?? ent);
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return s;
}

/* ═══════════════════════════════════════════════════════════
   Bulk insert to Worker
   ═══════════════════════════════════════════════════════════ */

async function bulkInsertToWorker(items) {
  const res = await fetch(`${WORKER_BASE}/lyrics/bulk`, {
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

  const oneArtist = (() => {
    const a = args.find(x => x.startsWith('--artist='));
    return a ? Number(a.split('=')[1]) : null;
  })();
  const manyArtists = (() => {
    const a = args.find(x => x.startsWith('--artists='));
    if (!a) return null;
    return a.split('=')[1].split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
  })();
  const missingOnly = args.includes('--missing-only');

  if (!oneArtist && !manyArtists && !missingOnly) {
    emit({ stage: 'failed', status: 'failed', error: 'Provide --artist, --artists, or --missing-only' });
    process.exit(1);
  }

  const artistFilter = oneArtist != null
    ? [oneArtist]
    : manyArtists != null
      ? manyArtists
      : null;

  /* ── Stage 1: dump ───────────────────────────── */

  log('Stage: dump');
  const { artists, tracks, existingLyrics } = await dumpD1();
  log(`  Loaded ${artists.length} artists, ${tracks.length} tracks, ${existingLyrics.length} existing lyrics rows`);

  const artistNameById = new Map(artists.map(a => [a.artist_id, a.artist_name]));

  /* ── Stage 2: filter ─────────────────────────── */

  const haveLyrics = new Set(existingLyrics.map(r => `${r.artist_id}::${r.track_name}`));

  let work = tracks;
  if (artistFilter) {
    const set = new Set(artistFilter);
    work = work.filter(t => set.has(t.artist_id));
  }
  if (missingOnly) {
    work = work.filter(t => !haveLyrics.has(`${t.artist_id}::${t.track_name}`));
  }

  log(`  Work list: ${work.length} tracks`);
  emit({ stage: 'filter', done: 1, total: 1 });

  if (work.length === 0) {
    log('Nothing to do.');
    emit({ stage: 'done', status: 'done', summary: { tracksTotal: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 } });
    return;
  }

  /* ── Stage 3: matb3aa search ─────────────────── */

  log('Stage: matb3aa-search');
  emit({ stage: 'matb3aa-search', done: 0, total: work.length });

  let done = 0;
  const matb3aaResults = new Map();
  await pLimit(work, CONCURRENCY, async (item) => {
    const r = await matb3aaSarchTrack(item.track_name, item.artist_id);
    matb3aaResults.set(`${item.artist_id}::${item.track_name}`, {
      ...item,
      matched: !!r.matched,
      matb3aaId: r.matched ? r.matb3aaId : null,
      albumName: r.matched ? r.albumName : null,
    });
    done++;
    if (done % 25 === 0 || done === work.length) {
      emit({ stage: 'matb3aa-search', done, total: work.length });
    }
    await sleep(REQUEST_DELAY);
  });

  const matb3aaMatched = [...matb3aaResults.values()].filter(r => r.matched);
  log(`  matb3aa search: ${matb3aaMatched.length} matched / ${work.length}`);

  /* ── Stage 4: matb3aa fetch lyrics ───────────── */

  log('Stage: matb3aa-fetch');
  emit({ stage: 'matb3aa-fetch', done: 0, total: matb3aaMatched.length });

  done = 0;
  const matb3aaLyrics = new Map();      // key → { lyrics, chars } | null
  await pLimit(matb3aaMatched, CONCURRENCY, async (item) => {
    const r = await matb3aaFetchLyrics(item.matb3aaId);
    matb3aaLyrics.set(`${item.artist_id}::${item.track_name}`, r.ok ? r : null);
    done++;
    if (done % 25 === 0 || done === matb3aaMatched.length) {
      emit({ stage: 'matb3aa-fetch', done, total: matb3aaMatched.length });
    }
    await sleep(REQUEST_DELAY);
  });

  /* ── Stage 5: lyrics.nu match ────────────────── */

  log('Stage: lyricsnu-match');
  emit({ stage: 'lyricsnu-match', done: 0, total: 1 });

  const artistIdsInScope = [...new Set(work.map(t => t.artist_id))];
  const slugCache = new Map();
  const lyricsNuMatches = new Map();     // key → { url, tier } | null

  for (let i = 0; i < artistIdsInScope.length; i++) {
    const artistId = artistIdsInScope[i];
    const artistName = artistNameById.get(artistId);
    if (!artistName) continue;

    const resolved = await lyricsNuResolveArtistSlug(artistName, slugCache);
    if (!resolved.found) continue;

    const songUrls = await lyricsNuFetchSingerSongs(resolved.slug);
    const slugMap = new Map();
    for (const u of songUrls) {
      const slug = songSlugFromUrl(u);
      if (!slug) continue;
      const norm = normalizeArabic(slug);
      if (norm && !slugMap.has(norm)) slugMap.set(norm, u);
    }
    const slugKeys = [...slugMap.keys()];

    const tracksForArtist = work.filter(t => t.artist_id === artistId);
    for (const t of tracksForArtist) {
      const m = lyricsNuMatchTrack(t.track_name, slugMap, slugKeys);
      if (m) lyricsNuMatches.set(`${t.artist_id}::${t.track_name}`, m);
    }

    emit({ stage: 'lyricsnu-match', done: i + 1, total: artistIdsInScope.length });
  }

  /* ── Stage 6: lyrics.nu fetch ────────────────── */

  log('Stage: lyricsnu-fetch');
  const lyricsNuWork = [...lyricsNuMatches.entries()].map(([k, v]) => {
    const [artist_id, track_name] = k.split('::');
    return { key: k, artist_id: Number(artist_id), track_name, url: v.url };
  });
  emit({ stage: 'lyricsnu-fetch', done: 0, total: lyricsNuWork.length });

  done = 0;
  const lyricsNuBodies = new Map();
  await pLimit(lyricsNuWork, CONCURRENCY, async (item) => {
    const html = await fetchText(item.url, LYRICS_NU_HEADERS);
    const parsed = html ? extractLyricsFromHtml(html) : null;
    lyricsNuBodies.set(item.key, parsed);
    done++;
    if (done % 25 === 0 || done === lyricsNuWork.length) {
      emit({ stage: 'lyricsnu-fetch', done, total: lyricsNuWork.length });
    }
    await sleep(REQUEST_DELAY);
  });

  /* ── Stage 7: compare ────────────────────────── */

  log('Stage: compare');
  emit({ stage: 'compare', done: 0, total: work.length });

  const finalRows = [];
  done = 0;

  for (const t of work) {
    const key = `${t.artist_id}::${t.track_name}`;
    const mb = matb3aaLyrics.get(key);
    const ln = lyricsNuBodies.get(key);

    const mbValid = mb && mb.charCount >= MATB3AA_MIN_CHARS;
    const lnValid = !!ln;

    let picked = null;
    if (mbValid && lnValid) {
      picked = mb.charCount >= ln.charCount ? mb : ln;
    } else if (mbValid) {
      picked = mb;
    } else if (lnValid) {
      picked = ln;
    }

    if (picked) {
      finalRows.push({
        artist_id: t.artist_id,
        track_name: t.track_name,
        lyrics: picked.lyrics,
      });
    }

    done++;
    if (done % 200 === 0 || done === work.length) {
      emit({ stage: 'compare', done, total: work.length });
    }
  }

  log(`  compare: ${finalRows.length} tracks have lyrics`);

  /* ── Stage 8: bulk insert ────────────────────── */

  log('Stage: bulk-insert');
  emit({ stage: 'bulk-insert', done: 0, total: finalRows.length });

  done = 0;
  let inserted = 0, updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < finalRows.length; i += BULK_BATCH_SIZE) {
    const batch = finalRows.slice(i, i + BULK_BATCH_SIZE);
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
    done += batch.length;
    emit({ stage: 'bulk-insert', done, total: finalRows.length });
  }

  /* ── Done ────────────────────────────────────── */

  const summary = {
    tracksTotal: work.length,
    matb3aaMatched: matb3aaMatched.length,
    lyricsNuMatched: lyricsNuMatches.size,
    withLyrics: finalRows.length,
    inserted,
    updated,
    skipped,
    errors,
  };

  log('');
  log('════════════ Summary ════════════');
  log(`Tracks in scope      : ${work.length}`);
  log(`matb3aa matched      : ${matb3aaMatched.length}`);
  log(`lyrics.nu matched    : ${lyricsNuMatches.size}`);
  log(`With lyrics (final)  : ${finalRows.length}`);
  log(`Inserted             : ${inserted}`);
  log(`Updated              : ${updated}`);
  log(`Skipped              : ${skipped}`);
  log(`Errors               : ${errors}`);

  emit({ stage: 'done', status: 'done', summary });
}

main().catch(err => {
  emit({ stage: 'failed', status: 'failed', error: err.message });
  process.exit(1);
});