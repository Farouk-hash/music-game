#!/usr/bin/env node
/**
 * Crawl lyrics.nu and match our D1 track names to song URLs.
 * Read-only — writes lyrics-matches.json, does not touch D1.
 *
 * Usage:
 *   node scripts/match-lyrics-nu.js
 *   node scripts/match-lyrics-nu.js --artist=65
 *   node scripts/match-lyrics-nu.js --enrich   (re-resolve only unfound artists)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTISTS_FILE = join(__dirname, 'artists.json');
const TRACKS_FILE  = join(__dirname, 'tracks.json');
const OUTPUT_FILE  = join(__dirname, 'lyrics-matches.json');

const LYRICS_BASE   = 'https://lyrics.nu';
const USER_AGENT    = 'matb3aa-game-lyrics-matcher/0.2';
const PAGE_DELAY_MS = 400;
const CONCURRENCY   = 4;
const MAX_PAGES     = 30;

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

async function fetchWithRetry(url, { retries = 3, delay = 800 } = {}) {
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
   Arabic normalizer
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

/* ═══════════════════════════════════════════════════════════
   Levenshtein
   ═══════════════════════════════════════════════════════════ */

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
   lyrics.nu crawling
   ═══════════════════════════════════════════════════════════ */

async function fetchSingerSongs(singerSlug) {
  const base = `${LYRICS_BASE}/singer/${encodeURIComponent(singerSlug)}/`;
  const songUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? base : `${base}page/${page}/`;
    const res = await fetchWithRetry(url);
    if (!res) break;
    const html = await res.text();
    const matches = [...html.matchAll(/href="(https:\/\/lyrics\.nu\/kalimat-aghani\/[^"]+)"/g)];
    const before = songUrls.size;
    for (const m of matches) songUrls.add(m[1]);
    const gained = songUrls.size - before;
    if (gained === 0 && page > 1) break;
    await sleep(PAGE_DELAY_MS);
  }
  return [...songUrls];
}

function songSlugFromUrl(url) {
  const m = url.match(/\/kalimat-aghani\/([^/]+)\//);
  return m ? m[1] : null;
}

/* ═══════════════════════════════════════════════════════════
   Artist slug resolution (letter index)
   Returns an object with diagnostics even on failure.
   ═══════════════════════════════════════════════════════════ */

const slugCache = new Map();   // artistName → resolution object

/** Extract "artist part" from a lyrics.nu slug.
 *  Slugs look like: "كلمات-اغاني-{artist-slug}" or "كلمات-اغانى-{artist-slug}".
 *  Returns the part after the 2nd hyphen. */
function artistPartFromSlug(slugDecoded) {
  const parts = slugDecoded.split('-');
  // Drop the first two words ("كلمات اغاني" / "كلمات اغانى")
  return parts.slice(2).join(' ');
}

/** Fetch the letter index page and extract all singer links. */
async function fetchLetterIndex(letter) {
  const url = `${LYRICS_BASE}/singers-names-that-start-with/${encodeURIComponent(letter)}/`;
  const res = await fetchWithRetry(url);
  if (!res) return { ok: false, links: [], status: 'index-404' };
  const html = await res.text();
  const raw = [...html.matchAll(/href="(https:\/\/lyrics\.nu\/singer\/([^"]+)\/)"/g)];
  const seen = new Set();
  const links = [];
  for (const m of raw) {
    const full = m[1];
    const slugEncoded = m[2];
    if (seen.has(slugEncoded)) continue;
    seen.add(slugEncoded);
    links.push({ url: full, slugEncoded });
  }
  return { ok: true, links };
}

/**
 * Resolve an artist's lyrics.nu slug.
 * Always returns an object:
 *   { found: true,  slug, url, reason: 'exact' | 'fuzzy', triedLetter, candidateCount }
 *   { found: false, reason, triedLetter, candidateCount, sampleNames: [...] }
 *
 * reason values:
 *   'empty-after-normalize'     — the name produced nothing after normalization
 *   'index-404'                 — the letter index page wasn't reachable
 *   'letter-index-empty'        — the letter index had zero singer links
 *   'no-match-in-letter-index'  — we scanned candidates, none matched
 */
async function resolveArtistSlug(artistName) {
  if (slugCache.has(artistName)) return slugCache.get(artistName);

  const normTarget = normalizeArabic(artistName);
  if (!normTarget) {
    const out = { found: false, reason: 'empty-after-normalize', triedLetter: null, candidateCount: 0, sampleNames: [] };
    slugCache.set(artistName, out);
    return out;
  }

  const firstLetter = normTarget[0];
  const { ok, links, status } = await fetchLetterIndex(firstLetter);

  if (!ok) {
    const out = { found: false, reason: status ?? 'index-404', triedLetter: firstLetter, candidateCount: 0, sampleNames: [] };
    slugCache.set(artistName, out);
    return out;
  }

  if (links.length === 0) {
    const out = { found: false, reason: 'letter-index-empty', triedLetter: firstLetter, candidateCount: 0, sampleNames: [] };
    slugCache.set(artistName, out);
    return out;
  }

  // Build normalized slug names
  const candidates = links.map(c => {
    const slugDecoded = (() => { try { return decodeURIComponent(c.slugEncoded); } catch { return c.slugEncoded; } })();
    const artistPart = artistPartFromSlug(slugDecoded);
    return { url: c.url, slugDecoded, slugArtistNorm: normalizeArabic(artistPart) };
  });

  // Exact match
  for (const c of candidates) {
    if (c.slugArtistNorm === normTarget) {
      const out = { found: true, slug: c.slugDecoded, url: c.url, reason: 'exact', triedLetter: firstLetter, candidateCount: links.length };
      slugCache.set(artistName, out);
      return out;
    }
  }

  // Fuzzy fallback (d ≤ 2)
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(normTarget, c.slugArtistNorm);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (bestDist <= 2 && best) {
    const out = { found: true, slug: best.slugDecoded, url: best.url, reason: `fuzzy(d=${bestDist})`, triedLetter: firstLetter, candidateCount: links.length };
    slugCache.set(artistName, out);
    return out;
  }

  // No match — capture sample names so you can see who was on that letter page
  const sampleNames = candidates.slice(0, 10).map(c => c.slugArtistNorm);
  const out = {
    found: false,
    reason: 'no-match-in-letter-index',
    triedLetter: firstLetter,
    candidateCount: links.length,
    bestDist: bestDist === Infinity ? null : bestDist,
    bestCandidate: best?.slugArtistNorm ?? null,
    sampleNames,
  };
  slugCache.set(artistName, out);
  return out;
}

/* ═══════════════════════════════════════════════════════════
   Matching tiers (identical logic to the previous version)
   ═══════════════════════════════════════════════════════════ */

function matchTrack(rawName, slugMap, slugKeys) {
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
  }

  if (words.length >= 3) {
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
      if (k.length < 3) continue;
      if (k === norm) continue;
      if (k.includes(norm) || norm.includes(k)) {
        return { url: slugMap.get(k), tier: 'CONTAIN' };
      }
    }
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  const args = process.argv.slice(2);
  const onlyArtist = (() => {
    const a = args.find(x => x.startsWith('--artist='));
    return a ? Number(a.split('=')[1]) : null;
  })();

  console.log('Reading artists.json and tracks.json ...');
  const artistsRaw = JSON.parse(await readFile(ARTISTS_FILE, 'utf8'));
  const tracksRaw  = JSON.parse(await readFile(TRACKS_FILE,  'utf8'));

  const artists = (Array.isArray(artistsRaw[0]?.results) ? artistsRaw[0].results : artistsRaw);
  const tracks  = (Array.isArray(tracksRaw[0]?.results)  ? tracksRaw[0].results  : tracksRaw);

  console.log(`Loaded ${artists.length} artists, ${tracks.length} track rows`);

  const tracksByArtist = new Map();
  for (const t of tracks) {
    if (!tracksByArtist.has(t.artist_id)) tracksByArtist.set(t.artist_id, []);
    tracksByArtist.get(t.artist_id).push(t.track_name);
  }

  const filteredArtists = onlyArtist
    ? artists.filter(a => a.artist_id === onlyArtist)
    : artists;

  if (onlyArtist && filteredArtists.length === 0) {
    console.error(`Artist ${onlyArtist} not found in artists.json`);
    process.exit(1);
  }

  console.log(`Processing ${filteredArtists.length} artists (concurrency ${CONCURRENCY}) ...\n`);

  const summary = {
    artistsTotal: filteredArtists.length,
    artistsMatched: 0,
    artistsNotFound: 0,
    artistsErrored: 0,
    tracksTotal: 0,
    tracksMatched: 0,
    tracksMissed: 0,
  };

  const unfoundArtists = [];
  let done = 0;

  const results = await pLimit(filteredArtists, CONCURRENCY, async (artist) => {
    const trackNames = tracksByArtist.get(artist.artist_id) ?? [];
    const result = {
      artistId: artist.artist_id,
      artistName: artist.artist_name,
      lyricsNuSlug: null,
      singerUrl: null,
      songUrlCount: 0,
      resolution: null,
      matched: [],
      missed: [],
      error: null,
    };

    try {
      const resolved = await resolveArtistSlug(artist.artist_name);
      result.resolution = resolved;

      if (!resolved || !resolved.found) {
        result.error = resolved?.reason ?? 'not-found';
        summary.artistsNotFound++;
        unfoundArtists.push({
          artistId: artist.artist_id,
          artistName: artist.artist_name,
          reason: resolved?.reason ?? 'not-found',
          triedLetter: resolved?.triedLetter ?? null,
          candidateCount: resolved?.candidateCount ?? 0,
          bestDist: resolved?.bestDist ?? null,
          bestCandidate: resolved?.bestCandidate ?? null,
          sampleNames: resolved?.sampleNames ?? [],
        });
      } else {
        result.lyricsNuSlug = resolved.slug;
        result.singerUrl = resolved.url;

        const songUrls = await fetchSingerSongs(resolved.slug);
        result.songUrlCount = songUrls.length;

        const slugMap = new Map();
        for (const u of songUrls) {
          const slug = songSlugFromUrl(u);
          if (!slug) continue;
          const norm = normalizeArabic(slug);
          if (norm && !slugMap.has(norm)) slugMap.set(norm, u);
        }
        const slugKeys = [...slugMap.keys()];

        for (const tn of trackNames) {
          const m = matchTrack(tn, slugMap, slugKeys);
          if (m) {
            result.matched.push({ trackName: tn, songUrl: m.url, tier: m.tier });
            summary.tracksMatched++;
          } else {
            result.missed.push(tn);
            summary.tracksMissed++;
          }
        }
        summary.artistsMatched++;
      }
    } catch (err) {
      result.error = String(err.message ?? err);
      summary.artistsErrored++;
    }

    summary.tracksTotal += trackNames.length;
    done++;
    const pct = ((done / filteredArtists.length) * 100).toFixed(0);
    const tag = result.resolution?.found
      ? `${result.matched.length}✓ / ${result.missed.length}✗`
      : `⚠ ${result.error}`;
    console.log(
      `[${String(done).padStart(3)}/${filteredArtists.length} ${String(pct).padStart(3)}%] ` +
      `${artist.artist_name}  →  ${tag}`
    );

    return result;
  });

  summary.hitRate = summary.tracksTotal > 0
    ? Math.round((summary.tracksMatched / summary.tracksTotal) * 1000) / 10
    : 0;

  // Sort unfound for readability: most candidates first (more likely fixable)
  unfoundArtists.sort((a, b) => (b.candidateCount ?? 0) - (a.candidateCount ?? 0));

  const output = {
    generatedAt: new Date().toISOString(),
    summary,
    unfoundArtists,
    artists: results,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n════════════ Summary ════════════');
  console.log(`Artists tested     : ${summary.artistsTotal}`);
  console.log(`  ✓ matched        : ${summary.artistsMatched}`);
  console.log(`  ✗ not found      : ${summary.artistsNotFound}`);
  console.log(`  ⚠ errored        : ${summary.artistsErrored}`);
  console.log(`Tracks tested      : ${summary.tracksTotal}`);
  console.log(`  ✓ matched        : ${summary.tracksMatched}  (${summary.hitRate}%)`);
  console.log(`  ✗ missed         : ${summary.tracksMissed}`);

  if (unfoundArtists.length > 0) {
    console.log('\n════════════ Unfound artists ════════════');
    const byReason = {};
    for (const u of unfoundArtists) {
      byReason[u.reason] = (byReason[u.reason] ?? 0) + 1;
    }
    for (const [reason, count] of Object.entries(byReason)) {
      console.log(`  ${reason}: ${count}`);
    }

    console.log('\nDetail (first 40):');
    for (const u of unfoundArtists.slice(0, 40)) {
      const info = u.reason === 'no-match-in-letter-index'
        ? `letter="${u.triedLetter}" candidates=${u.candidateCount} bestD=${u.bestDist ?? '-'}`
        : `letter="${u.triedLetter}" candidates=${u.candidateCount}`;
      console.log(`  ✗ [${u.artistId}] ${u.artistName}  —  ${u.reason}  (${info})`);
      if (u.bestCandidate && u.reason === 'no-match-in-letter-index') {
        console.log(`      closest: "${u.bestCandidate}"`);
      }
    }
  }

  console.log(`\nWrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});