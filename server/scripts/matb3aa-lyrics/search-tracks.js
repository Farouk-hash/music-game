#!/usr/bin/env node
/**
 * Search matb3aa by track name and resolve each D1 track to a matb3aa track ID.
 * Writes search-results.json. Does not fetch lyrics, does not touch D1.
 *
 * Usage:
 *   node scripts/matb3aa-lyrics/search-tracks.js
 *   node scripts/matb3aa-lyrics/search-tracks.js --artist=65
 *   node scripts/matb3aa-lyrics/search-tracks.js --fresh
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTISTS_FILE = join(__dirname, 'artists.json');
const TRACKS_FILE  = join(__dirname, 'tracks.json');
const OUTPUT_FILE  = join(__dirname, 'search-results.json');

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
const MAX_SEARCH_PAGES = 3;

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
   Search matb3aa for a track name.
   Returns { trackId, matb3aaName, matchedArtistId } or null.
   Match rule: result.name === name && result.artists[0].id === artistId
   ═══════════════════════════════════════════════════════════ */

async function searchTrack(trackName, artistId) {
  const q = encodeURIComponent(trackName);
  let url = `${MATB3AA_BASE}/api/v1/search?query=${q}&loader=searchPage`;

  for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
    const data = await fetchJson(url);
    if (!data) return { matched: false, reason: 'fetch-failed', triedPages: page };

    const tracks = data?.results?.tracks?.data ?? [];

    // Exact-name + exact-artist match
    for (const t of tracks) {
      if (t.name !== trackName) continue;
      const primaryArtistId = t.artists?.[0]?.id ?? null;
      if (primaryArtistId === artistId) {
        return {
          matched: true,
          matb3aaId: t.id,
          matb3aaName: t.name,
          matb3aaArtistId: primaryArtistId,
          duration: t.duration ?? null,
          albumName: t.album?.name ?? null,
          triedPages: page,
        };
      }
    }

    // Some tracks have multiple artists — check all artists in the array
    for (const t of tracks) {
      if (t.name !== trackName) continue;
      const ids = (t.artists ?? []).map(a => a.id);
      if (ids.includes(artistId)) {
        return {
          matched: true,
          matb3aaId: t.id,
          matb3aaName: t.name,
          matb3aaArtistId: t.artists?.[0]?.id ?? null,
          duration: t.duration ?? null,
          albumName: t.album?.name ?? null,
          triedPages: page,
          matchedByFeaturedArtist: true,
        };
      }
    }

    // No match on this page — paginate if there is a next page
    const nextPage = data?.results?.tracks?.next_page;
    if (!nextPage) break;
    url = `${MATB3AA_BASE}/api/v1/search?query=${q}&loader=searchPage&page=${nextPage}`;
    await sleep(REQUEST_DELAY);
  }

  return { matched: false, reason: 'no-exact-match' };
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

  console.log('Reading artists.json and tracks.json ...');
  const artistsRaw = JSON.parse(await readFile(ARTISTS_FILE, 'utf8'));
  const tracksRaw  = JSON.parse(await readFile(TRACKS_FILE,  'utf8'));

  const artists = (Array.isArray(artistsRaw[0]?.results) ? artistsRaw[0].results : artistsRaw);
  const tracks  = (Array.isArray(tracksRaw[0]?.results)  ? tracksRaw[0].results  : tracksRaw);

  console.log(`Loaded ${artists.length} artists, ${tracks.length} track rows`);

  // Build work list — { artistId, artistName, trackName }
  const artistNameById = new Map(artists.map(a => [a.artist_id, a.artist_name]));
  let work = tracks
    .filter(t => artistFilter === null || t.artist_id === artistFilter)
    .map(t => ({
      artistId: t.artist_id,
      artistName: artistNameById.get(t.artist_id) ?? null,
      trackName: t.track_name,
    }));

  console.log(`Work list: ${work.length} tracks${artistFilter ? ` (artist ${artistFilter})` : ''}`);

  // Resume
  let existing = null;
  if (!fresh && await fileExists(OUTPUT_FILE)) {
    console.log('Found existing search-results.json — resuming (use --fresh to ignore)');
    existing = JSON.parse(await readFile(OUTPUT_FILE, 'utf8'));
  }
  const existingKey = (a, n) => `${a}::${n}`;
  const existingMap = new Map();
  if (existing && Array.isArray(existing.results)) {
    for (const r of existing.results) {
      if (r.matched) existingMap.set(existingKey(r.artistId, r.trackName), r);
    }
    console.log(`  ${existingMap.size} tracks already resolved`);
  }

  const toSearch = work.filter(w => !existingMap.has(existingKey(w.artistId, w.trackName)));
  console.log(`To search: ${toSearch.length}\n`);

  const t0 = Date.now();
  let done = 0;
  const found = new Map();

  await pLimit(toSearch, CONCURRENCY, async (item) => {
    const r = await searchTrack(item.trackName, item.artistId);
    const entry = {
      artistId: item.artistId,
      artistName: item.artistName,
      trackName: item.trackName,
      matched: !!r.matched,
      matb3aaId: r.matched ? r.matb3aaId : null,
      matb3aaName: r.matched ? r.matb3aaName : null,
      matb3aaArtistId: r.matched ? r.matb3aaArtistId : null,
      albumName: r.matched ? r.albumName : null,
      duration: r.matched ? r.duration : null,
      reason: r.matched ? null : (r.reason ?? 'no-match'),
      triedPages: r.triedPages ?? null,
      searchedAt: new Date().toISOString(),
    };
    found.set(existingKey(item.artistId, item.trackName), entry);
    done++;

    if (done % 25 === 0 || done === toSearch.length) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = (done / Math.max(1, elapsed)).toFixed(1);
      const eta = ((toSearch.length - done) / Math.max(0.1, done / elapsed)).toFixed(0);
      console.log(`[${String(done).padStart(5)}/${toSearch.length}]  ${rate}/s  ETA ${eta}s`);
    }

    await sleep(REQUEST_DELAY);
  });

  // Merge in original order
  const results = work.map(w => found.get(existingKey(w.artistId, w.trackName))
                              ?? existingMap.get(existingKey(w.artistId, w.trackName))
                              ?? { artistId: w.artistId, artistName: w.artistName, trackName: w.trackName, matched: false, reason: 'not-attempted' });

  const matched = results.filter(r => r.matched).length;
  const missed  = results.length - matched;

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      tracksTotal: results.length,
      matched,
      missed,
      matchRate: results.length > 0 ? Math.round((matched / results.length) * 1000) / 10 : 0,
      fromCache: existingMap.size,
      searchedThisRun: found.size,
    },
    results,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n════════════ Summary ════════════');
  console.log(`Tracks total     : ${output.summary.tracksTotal}`);
  console.log(`  ✓ matched      : ${output.summary.matched}  (${output.summary.matchRate}%)`);
  console.log(`  ✗ missed       : ${output.summary.missed}`);
  console.log(`\nWrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});