#!/usr/bin/env node
/**
 * Backfill album years for existing tracks.
 *
 * Flow (per D1 album name):
 *
 *   If the name has an album prefix ("البوم" / "ألبوم" / "الالبوم"):
 *     1. matb3aa with the D1 artist_id, cleaned name
 *     2. albumaty, cleaned name
 *     3. albumaty, cleaned name with "ألبوم " prefix re-added
 *     4. albumaty, cleaned name with "البوم " prefix re-added
 *
 *   If the name has NO prefix:
 *     1. albumaty, raw name
 *     2. matb3aa, raw name
 *     3. matb3aa, raw name with "البوم " prefix added
 *     4. matb3aa, raw name with "ألبوم " prefix added
 *
 * Each source's map is populated once per artist (one HTTP request each).
 * Maps store both a "clean" key (prefix stripped) and a "raw" key so
 * lookups can try either.
 *
 * Read-only against D1. Writes `album-years.json`.
 *
 * Usage:
 *   node scripts/backfill-album-years.js --artists=9,90181,35
 *   node scripts/backfill-album-years.js --all [--limit=N]
 */

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WRANGLER_CWD = 'E:\\matb3aa-game\\music-game-wrangler';
const DB_NAME = 'music-game-db';
const OUTPUT = join(__dirname, 'album-years.json');

const MATB3AA_BASE = 'https://www.matb3aa.com';
const MATB3AA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.matb3aa.com/',
  'Origin':  'https://www.matb3aa.com',
  'Accept':  'application/json',
};

const ALBUMATY_BASE = 'https://www.albumaty.com';
const ALBUMATY_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'ar,en;q=0.9',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════
   D1 via wrangler
   ═══════════════════════════════════════════════════════════ */

function wranglerQuery(sql) {
  return new Promise((resolve, reject) => {
    const cmd = `npx wrangler d1 execute ${DB_NAME} --remote --json --command="${sql.replace(/"/g, '\\"')}"`;
    const child = spawn(cmd, [], { cwd: WRANGLER_CWD, shell: true, windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('exit', code => {
      if (code !== 0) return reject(new Error(`wrangler exit ${code}: ${stderr.slice(0, 300)}`));
      try {
        const parsed = JSON.parse(stdout);
        resolve(Array.isArray(parsed) ? (parsed[0]?.results ?? []) : (parsed.results ?? []));
      } catch (e) {
        reject(new Error(`wrangler JSON parse: ${e.message}`));
      }
    });
    child.on('error', reject);
  });
}

/* ═══════════════════════════════════════════════════════════
   Arabic / album-name helpers
   ═══════════════════════════════════════════════════════════ */

function normalizeArabic(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670]/g, '')                 // diacritics + tatweel
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')            // آ أ إ → ا
    .replace(/[\u0649\u0626]/g, '\u064A')                  // ى ئ → ي
    .replace(/\u0629/g, '\u0647')                          // ة → ه
    .replace(/[\u0660-\u0669]/g, d =>                      // ٠١٢… → 012…
      String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[\u06F0-\u06F9]/g, d =>                      // ۰۱۲… → 012…
      String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30))
    .replace(/[^\p{L}\p{Nd}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip a leading album prefix:
 *   "البوم حبيتك"     → "حبيتك"
 *   "الالبوم حبيتك"   → "حبيتك"
 *   "ألبوم حبيتك"     → "حبيتك"
 *   "ألالبوم حبيتك"   → "حبيتك"
 */
function stripAlbumPrefix(s) {
  return String(s || '')
    .replace(/^(?:ال)?[اأ]لبوم\s+/, '')
    .trim();
}

function hasAlbumPrefix(name) {
  return /^(?:ال)?[اأ]لبوم\s/.test(String(name || ''));
}

/** Canonical key for prefix-stripped names. */
function cleanKey(name) {
  return normalizeArabic(stripAlbumPrefix(name));
}

/** Canonical key for the raw (un-stripped) name. */
function rawKey(name) {
  return normalizeArabic(name);
}

/* ═══════════════════════════════════════════════════════════
   matb3aa
   ═══════════════════════════════════════════════════════════ */

function yearFromIso(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-/);
  return m ? Number(m[1]) : null;
}

/**
 * Fetch the artist's album list from matb3aa (one paginated endpoint).
 * Returns album objects with { id, name, release_date, image }.
 */
async function matb3aaAlbumsForArtist(artistId) {
  const albums = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${MATB3AA_BASE}/api/v1/artists/${artistId}/albums?perPage=100&page=${page}`;
    let j;
    try {
      const res = await fetch(url, { headers: MATB3AA_HEADERS });
      if (!res.ok) break;
      j = await res.json();
    } catch {
      break;
    }
    const items = j?.pagination?.data ?? [];
    if (!items.length) break;
    albums.push(...items);
    if (!j?.pagination?.next_page) break;
    await sleep(200);
  }
  return albums;
}

/**
 * Build a lookup Map for matb3aa albums.
 * Stores BOTH the clean key and the raw key for each album.
 * Value: { name, year } — if `year` is null the album is present but unusable.
 */
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

/** Parse the <div class="singer-albums"> block on a singer page. */
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

    const titleHtml = raw
      .replace(/<img[^>]*>/g, '')
      .replace(/<small[^>]*>[^<]*<\/small>/g, '');
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

/**
 * Build a lookup Map for albumaty albums.
 * Stores BOTH the clean key and the raw key for each album.
 */
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

/* ── Albumaty singer index ─────────────────────────────── */

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

/* ═══════════════════════════════════════════════════════════
   Fallback-chain resolver
   ═══════════════════════════════════════════════════════════ */

/**
 * Resolve the year for one D1 album using the fallback chain.
 * Returns { year, source, attempts } where attempts records what was tried.
 */
function resolveAlbumYear(d1Album, matb3aaMap, albumatyMap) {
  const prefixed = hasAlbumPrefix(d1Album);
  const clean = cleanKey(d1Album);
  const raw = rawKey(d1Album);

  const attempts = [];

  const tryMap = (map, key, label) => {
    if (!map) return null;
    const hit = map.get(key);
    attempts.push({ try: label, key, hit: !!hit, year: hit?.year ?? null });
    if (hit?.year) return { year: hit.year, source: label };
    return null;
  };

  if (prefixed) {
    // Prefixed album → matb3aa first, then albumaty (various keys)
    const steps = [
      [matb3aaMap, clean, 'matb3aa'],
      [albumatyMap, clean, 'albumaty'],
      [albumatyMap, raw, 'albumaty-raw'],
      [albumatyMap, cleanKey(`ألبوم ${stripAlbumPrefix(d1Album)}`), 'albumaty+ألبوم'],
      [albumatyMap, cleanKey(`البوم ${stripAlbumPrefix(d1Album)}`), 'albumaty+البوم'],
    ];
    for (const [map, key, label] of steps) {
      const r = tryMap(map, key, label);
      if (r) return { ...r, attempts };
    }
  } else {
    // Non-prefixed album → albumaty first, then matb3aa
    const steps = [
      [albumatyMap, raw, 'albumaty'],
      [albumatyMap, clean, 'albumaty-clean'],
      [matb3aaMap, raw, 'matb3aa-raw'],
      [matb3aaMap, clean, 'matb3aa'],
      [matb3aaMap, cleanKey(`البوم ${d1Album}`), 'matb3aa+البوم'],
      [matb3aaMap, cleanKey(`ألبوم ${d1Album}`), 'matb3aa+ألبوم'],
    ];
    for (const [map, key, label] of steps) {
      const r = tryMap(map, key, label);
      if (r) return { ...r, attempts };
    }
  }

  return { year: null, source: null, attempts };
}

/* ═══════════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const one = args.find(a => a.startsWith('--artist='));
  const many = args.find(a => a.startsWith('--artists='));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

  let artistRows = [];
  if (one) {
    const id = Number(one.split('=')[1]);
    artistRows = await wranglerQuery(`SELECT id, name FROM artists WHERE id = ${id}`);
  } else if (many) {
    const ids = many.split('=')[1].split(',').map(Number).join(',');
    artistRows = await wranglerQuery(`SELECT id, name FROM artists WHERE id IN (${ids})`);
  } else if (all) {
    const lim = limit ? ` LIMIT ${limit}` : '';
    artistRows = await wranglerQuery(
      `SELECT DISTINCT a.id, a.name
       FROM artists a
       JOIN tracks t ON t.artist_id = a.id
       WHERE t.album_name IS NOT NULL AND t.album_name != ''
       ORDER BY a.id${lim}`
    );
  } else {
    console.error('Usage: --artist=9 | --artists=9,35 | --all [--limit=N]');
    process.exit(1);
  }

  console.log(`Processing ${artistRows.length} artist(s)`);
  console.log('Loading albumaty singers index…');
  const albumatySingers = await loadAlbumatySingers();
  console.log(`  ${albumatySingers.size} albumaty singers indexed\n`);

  const resolved = [];
  const stats = {
    artistsTotal: 0,
    artistsMatb3aaFetched: 0,
    artistsAlbumatyFetched: 0,
    artistsAlbumatyNotFound: 0,
    albumsTotal: 0,
    albumsResolved: 0,
    bySource: {},
    unresolved: 0,
  };

  function bump(source) {
    stats.bySource[source] = (stats.bySource[source] ?? 0) + 1;
  }

  for (let i = 0; i < artistRows.length; i++) {
    const { id: artistId, name: artistName } = artistRows[i];
    stats.artistsTotal++;
    process.stdout.write(`[${i + 1}/${artistRows.length}] ${artistName} … `);

    const albumRows = await wranglerQuery(
      `SELECT DISTINCT album_name FROM tracks
       WHERE artist_id = ${artistId}
         AND album_name IS NOT NULL AND album_name != ''`
    );
    const albumNames = albumRows.map(r => r.album_name);
    if (albumNames.length === 0) {
      console.log('no albums');
      continue;
    }

    // ── matb3aa fetch (always, cheap) ──
    const matb3aaMap = new Map();
    try {
      const albums = await matb3aaAlbumsForArtist(artistId);
      const built = buildMatb3aaMap(albums);
      for (const [k, v] of built) matb3aaMap.set(k, v);
      if (matb3aaMap.size > 0) stats.artistsMatb3aaFetched++;
    } catch { /* ignore */ }

    // ── albumaty fetch (only if artist found) ──
    const albumatyMap = new Map();
    const singer = albumatySingers.get(normalizeArabic(artistName));
    if (!singer) {
      stats.artistsAlbumatyNotFound++;
    } else {
      try {
        const albums = await fetchAlbumatySingerAlbums(singer.id);
        const built = buildAlbumatyMap(albums);
        for (const [k, v] of built) albumatyMap.set(k, v);
        if (albumatyMap.size > 0) stats.artistsAlbumatyFetched++;
      } catch { /* ignore */ }
    }

    // ── Resolve each album ──
    let resolvedHere = 0;
    for (const album of albumNames) {
      stats.albumsTotal++;
      const { year, source, attempts } = resolveAlbumYear(
        album, matb3aaMap, albumatyMap
      );

      if (year) {
        stats.albumsResolved++;
        resolvedHere++;
        bump(source);
        resolved.push({
          artist_id: artistId,
          artist_name: artistName,
          album_name: album,
          album_year: year,
          source,
        });
      } 
    }

    process.stdout.write(`${resolvedHere}/${albumNames.length} resolved\n`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    stats,
    resolved,
    misses,
  };
  await writeFile(OUTPUT, JSON.stringify(out, null, 2), 'utf8');

  const pct = stats.albumsTotal > 0
    ? ((stats.albumsResolved / stats.albumsTotal) * 100).toFixed(1)
    : '0';

  console.log('');
  console.log('════════════ Summary ════════════');
  console.log(`Artists processed:           ${stats.artistsTotal}`);
  console.log(`  matb3aa album list:        ${stats.artistsMatb3aaFetched}`);
  console.log(`  albumaty singer found:     ${stats.artistsAlbumatyFetched}`);
  console.log(`  albumaty singer NOT found: ${stats.artistsAlbumatyNotFound}`);
  console.log(`Albums seen:                 ${stats.albumsTotal}`);
  console.log(`  resolved:                  ${stats.albumsResolved} (${pct}%)`);
  console.log('  by source:');
  const sources = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sources) {
    console.log(`    ${src.padEnd(22)} ${count}`);
  }
  console.log(`  unresolved:                ${stats.unresolved}`);
  console.log('');
  console.log(`Wrote ${OUTPUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});