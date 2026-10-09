#!/usr/bin/env node
/**
 * Read search-results.json, fetch lyrics for each matched matb3aa track ID,
 * write lyrics-bodies.json. Does not touch D1.
 *
 * Usage:
 *   node scripts/matb3aa-lyrics/fetch-lyrics.js
 *   node scripts/matb3aa-lyrics/fetch-lyrics.js --artist=65
 *   node scripts/matb3aa-lyrics/fetch-lyrics.js --fresh
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE  = join(__dirname, 'search-results.json');
const OUTPUT_FILE = join(__dirname, 'lyrics-bodies.json');

const MATB3AA_BASE = 'https://www.matb3aa.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.matb3aa.com/',
  'Origin':  'https://www.matb3aa.com',
  'Accept':  'application/json, text/plain, */*',
};

const CONCURRENCY   = 4;
const REQUEST_DELAY = 400;
const MAX_RETRIES   = 3;

/* ═══════════════════════════════════════════════════════════ */

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

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function fetchJson(url, { retries = MAX_RETRIES, delay = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
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
    } catch (err) {
      if (attempt === retries) return null;
      await sleep(delay * Math.pow(2, attempt));
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   Fetch lyrics for one matb3aa track ID.
   ═══════════════════════════════════════════════════════════ */

async function fetchLyrics(matb3aaId) {
  const url = `${MATB3AA_BASE}/api/v1/tracks/${matb3aaId}/lyrics?duration=0`;
  const data = await fetchJson(url);
  if (!data) return { ok: false, error: 'fetch-failed' };

  const lines = Array.isArray(data.lines) ? data.lines : [];
  if (lines.length === 0) {
    return { ok: false, error: data.status === 'success' ? 'empty-lyrics' : 'no-lyrics' };
  }

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
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  const args = process.argv.slice(2);
  const artistFilter = (() => {
    const a = args.find(x => x.startsWith('--artist='));
    return a ? Number(a.split('=')[1]) : null;
  })();
  const fresh = args.includes('--fresh');

  console.log('Reading search-results.json ...');
  const search = JSON.parse(await readFile(INPUT_FILE, 'utf8'));

  let work = (search.results ?? []).filter(r => r.matched);
  if (artistFilter !== null) {
    work = work.filter(r => r.artistId === artistFilter);
  }

  console.log(`Matched tracks to fetch: ${work.length}${artistFilter ? ` (artist ${artistFilter})` : ''}`);

  // Resume
  let existing = null;
  if (!fresh && await fileExists(OUTPUT_FILE)) {
    console.log('Found existing lyrics-bodies.json — resuming (use --fresh to ignore)');
    existing = JSON.parse(await readFile(OUTPUT_FILE, 'utf8'));
  }
  const existingKey = (a, n) => `${a}::${n}`;
  const existingMap = new Map();
  if (existing && Array.isArray(existing.tracks)) {
    for (const t of existing.tracks) {
      if (t.lyrics) existingMap.set(existingKey(t.artistId, t.trackName), t);
    }
    console.log(`  ${existingMap.size} tracks already fetched`);
  }

  const toFetch = work.filter(w => !existingMap.has(existingKey(w.artistId, w.trackName)));
  console.log(`To fetch: ${toFetch.length}\n`);

  const t0 = Date.now();
  let done = 0;
  const freshResults = new Map();

  await pLimit(toFetch, CONCURRENCY, async (item) => {
    const r = await fetchLyrics(item.matb3aaId);
    const entry = {
      artistId: item.artistId,
      artistName: item.artistName,
      trackName: item.trackName,
      matb3aaId: item.matb3aaId,
      matb3aaName: item.matb3aaName,
      albumName: item.albumName,
      lyrics: r.ok ? r.lyrics : null,
      bytes: r.ok ? r.bytes : 0,
      charCount: r.ok ? r.charCount : 0,
      lineCount: r.ok ? r.lineCount : 0,
      isSynced: r.ok ? r.isSynced : false,
      fetchedAt: new Date().toISOString(),
      error: r.ok ? null : (r.error ?? 'unknown'),
    };
    freshResults.set(existingKey(item.artistId, item.trackName), entry);
    done++;

    if (done % 25 === 0 || done === toFetch.length) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = (done / Math.max(1, elapsed)).toFixed(1);
      const eta = ((toFetch.length - done) / Math.max(0.1, done / elapsed)).toFixed(0);
      console.log(`[${String(done).padStart(5)}/${toFetch.length}]  ${rate}/s  ETA ${eta}s`);
    }

    await sleep(REQUEST_DELAY);
  });

  // Merge in original order
  const tracks = work.map(w => freshResults.get(existingKey(w.artistId, w.trackName))
                             ?? existingMap.get(existingKey(w.artistId, w.trackName))
                             ?? { artistId: w.artistId, artistName: w.artistName, trackName: w.trackName, matb3aaId: w.matb3aaId, lyrics: null, error: 'not-attempted' });

  let fetched = 0, failed = 0, totalBytes = 0;
  const errorCounts = {};
  for (const t of tracks) {
    if (t.lyrics) {
      fetched++;
      totalBytes += t.bytes ?? 0;
    } else {
      failed++;
      const e = t.error ?? 'unknown';
      errorCounts[e] = (errorCounts[e] ?? 0) + 1;
    }
  }
  const avgBytes = fetched > 0 ? Math.round(totalBytes / fetched) : 0;

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      tracksTotal: tracks.length,
      fetched,
      failed,
      totalBytes,
      avgBytes,
      fromCache: existingMap.size,
      fetchedThisRun: freshResults.size,
      errorBreakdown: errorCounts,
    },
    tracks,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n════════════ Summary ════════════');
  console.log(`Tracks total     : ${output.summary.tracksTotal}`);
  console.log(`  ✓ fetched      : ${output.summary.fetched}`);
  console.log(`  ✗ failed       : ${output.summary.failed}`);
  if (Object.keys(errorCounts).length > 0) {
    console.log('  Errors by type :');
    for (const [k, v] of Object.entries(errorCounts)) {
      console.log(`    ${k}: ${v}`);
    }
  }
  console.log(`Total bytes      : ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average bytes    : ${avgBytes}`);
  console.log(`\nWrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});