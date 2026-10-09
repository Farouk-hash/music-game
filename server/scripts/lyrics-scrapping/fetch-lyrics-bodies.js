#!/usr/bin/env node
/**
 * Read lyrics-matches.json, crawl each matched song URL,
 * extract the lyrics <section>, write lyrics-bodies.json.
 *
 * Read-only against lyrics.nu. Does not touch D1.
 *
 * Usage:
 *   node scripts/lyrics-scrapping/fetch-lyrics-bodies.js
 *   node scripts/lyrics-scrapping/fetch-lyrics-bodies.js --artist=65
 *   node scripts/lyrics-scrapping/fetch-lyrics-bodies.js --resume   (default: true)
 *   node scripts/lyrics-scrapping/fetch-lyrics-bodies.js --fresh    (ignore existing output)
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE  = join(__dirname, 'lyrics-matches.json');
const OUTPUT_FILE = join(__dirname, 'lyrics-bodies.json');

const USER_AGENT    = 'matb3aa-game-lyrics-fetcher/0.1';
const CONCURRENCY   = 4;
const REQUEST_DELAY = 400;   // ms between requests per worker
const MAX_RETRIES   = 3;

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

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function fetchWithRetry(url, { retries = MAX_RETRIES, delay = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) return res;
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(delay * Math.pow(2, attempt));
        continue;
      }
      return null;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(delay * Math.pow(2, attempt));
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   Lyrics extraction
   ═══════════════════════════════════════════════════════════ */

/**
 * Extract the lyrics body from a lyrics.nu song page.
 *
 * The lyrics live in the FIRST section with class
 * "w3-container w3-margin-bottom" that contains Arabic text
 * and is not the credits block.
 *
 * Steps:
 *   1. Locate <section class="w3-container w3-margin-bottom"> ... </section>
 *   2. Replace <br> / <br/> / <br /> with \n
 *   3. Strip all remaining tags
 *   4. Decode HTML entities (&amp;, &nbsp;, etc.)
 *   5. Collapse 3+ newlines to 2 (preserve stanza breaks)
 *   6. Trim
 *
 * Returns { lyrics, bytes, charCount } or null if not found.
 */
function extractLyrics(html) {
  if (!html) return null;

  const sectionRe = /<section\s+class="w3-container w3-margin-bottom">([\s\S]*?)<\/section>/i;
  const m = sectionRe.exec(html);
  if (!m) return null;

  let body = m[1];

  // <br> variants → newline
  body = body.replace(/<br\s*\/?>/gi, '\n');

  // Strip all remaining tags
  body = body.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  body = decodeHtmlEntities(body);

  // Normalize newlines: collapse 3+ → 2 (keeps stanza breaks)
  body = body.replace(/\r\n/g, '\n');
  body = body.replace(/\n{3,}/g, '\n\n');

  // Trim each line, drop leading/trailing whitespace
  body = body
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, ''))
    .join('\n')
    .trim();

  if (!body) return null;

  const bytes = Buffer.byteLength(body, 'utf8');
  const charCount = body.length;

  return { lyrics: body, bytes, charCount };
}

const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&laquo;': '«',
  '&raquo;': '»',
};

function decodeHtmlEntities(s) {
  s = s.replace(/&[a-z#0-9]+;/gi, ent => HTML_ENTITIES[ent.toLowerCase()] ?? ent);
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return s;
}

/* ═══════════════════════════════════════════════════════════
   Build the work list from lyrics-matches.json
   ═══════════════════════════════════════════════════════════ */

function buildWorkList(matches, artistFilter = null) {
  const work = [];
  for (const artist of matches.artists) {
    if (artistFilter !== null && artist.artistId !== artistFilter) continue;
    if (!artist.matched || artist.matched.length === 0) continue;
    for (const m of artist.matched) {
      work.push({
        artistId: artist.artistId,
        artistName: artist.artistName,
        trackName: m.trackName,
        songUrl: m.songUrl,
        tier: m.tier,
      });
    }
  }
  return work;
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

  console.log('Reading lyrics-matches.json ...');
  const matches = JSON.parse(await readFile(INPUT_FILE, 'utf8'));

  const work = buildWorkList(matches, artistFilter);
  console.log(`Work list: ${work.length} tracks${artistFilter ? ` (artist ${artistFilter} only)` : ''}`);

  // Resume: load existing output
  let existing = null;
  if (!fresh && await fileExists(OUTPUT_FILE)) {
    console.log('Found existing lyrics-bodies.json — resuming (use --fresh to ignore)');
    existing = JSON.parse(await readFile(OUTPUT_FILE, 'utf8'));
  }

  const existingByUrl = new Map();
  if (existing && Array.isArray(existing.tracks)) {
    for (const t of existing.tracks) {
      if (t.songUrl && !t.error) existingByUrl.set(t.songUrl, t);
    }
    console.log(`  ${existingByUrl.size} tracks already fetched`);
  }

  // Filter work: skip songs we already have
  const toFetch = work.filter(w => !existingByUrl.has(w.songUrl));
  console.log(`To fetch: ${toFetch.length}\n`);

  const results = new Array(work.length);
  const fetchedNow = new Map();
  let done = 0;
  const t0 = Date.now();

  await pLimit(toFetch, CONCURRENCY, async (item) => {
    const res = await fetchWithRetry(item.songUrl);
    let entry;

    if (!res) {
      entry = { ...item, lyrics: null, bytes: 0, charCount: 0, fetchedAt: new Date().toISOString(), error: 'fetch-failed' };
    } else {
      const html = await res.text();
      const parsed = extractLyrics(html);
      if (!parsed) {
        entry = { ...item, lyrics: null, bytes: 0, charCount: 0, fetchedAt: new Date().toISOString(), error: 'no-lyrics-section' };
      } else {
        entry = { ...item, lyrics: parsed.lyrics, bytes: parsed.bytes, charCount: parsed.charCount, fetchedAt: new Date().toISOString(), error: null };
      }
    }

    fetchedNow.set(item.songUrl, entry);
    done++;

    if (done % 50 === 0 || done === toFetch.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      const rate = (done / Math.max(1, elapsed)).toFixed(1);
      const eta = ((toFetch.length - done) / Math.max(0.1, done / elapsed)).toFixed(0);
      console.log(`[${String(done).padStart(5)}/${toFetch.length}]  ${rate}/s  ETA ${eta}s`);
    }

    await sleep(REQUEST_DELAY);
  });

  // Merge results in original order
  let fetchedCount = 0;
  let failedCount = 0;
  let totalBytes = 0;
  for (let i = 0; i < work.length; i++) {
    const item = work[i];
    const fresh = fetchedNow.get(item.songUrl);
    const cached = existingByUrl.get(item.songUrl);
    const entry = fresh ?? cached ?? {
      ...item, lyrics: null, bytes: 0, charCount: 0, fetchedAt: null, error: 'not-attempted',
    };
    results[i] = entry;

    if (entry.error) failedCount++;
    else {
      fetchedCount++;
      totalBytes += entry.bytes;
    }
  }

  const avgBytes = fetchedCount > 0 ? Math.round(totalBytes / fetchedCount) : 0;

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      tracksTotal: work.length,
      fetched: fetchedCount,
      failed: failedCount,
      totalBytes,
      avgBytes,
      fromCache: existingByUrl.size,
      fetchedThisRun: fetchedNow.size,
    },
    tracks: results,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n════════════ Summary ════════════');
  console.log(`Tracks total     : ${output.summary.tracksTotal}`);
  console.log(`  ✓ fetched      : ${output.summary.fetched}`);
  console.log(`  ✗ failed       : ${output.summary.failed}`);
  console.log(`Total bytes      : ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average bytes    : ${avgBytes}`);
  console.log(`\nWrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});