// server/scripts/albumaty-crawl/probe-v2.js
/**
 * Random artist probe — pick one artist from D1 ∪ albumaty,
 * crawl their songs, classify each track into three buckets:
 *
 *   1. NEW              — not in D1 → download + trim 2 clips
 *   2. NEEDS_ALBUM      — in D1 with no album_name → backfill album name only
 *   3. ALREADY_COMPLETE — in D1 with a matching album_name → skip entirely
 *
 * Also catches ALBUM_MISMATCH: track exists with a different album_name than
 * what albumaty shows for it.
 *
 * Hardened normalization:
 *   - Unicode NFC form
 *   - All whitespace variants collapsed
 *   - Zero-width joiners removed
 *   - Diacritics and tatweel stripped
 *   - Arabic letter variants unified (alef, ya, ta, heh, kaf)
 *   - Arabic-Indic and Persian digits → Western (١٢ → 12)
 *   - All non-letter/digit chars removed (including spaces)
 *   - Leading "اغنية" prefix stripped
 *
 * Debug:
 *   Set DEBUG_ARTIST=1 to print normalized artist names and D1 key set info.
 *
 * Does NOT write to D1 or R2. Writes JSON + MP3s to ./output/.
 *
 * Usage:
 *   node scripts/albumaty-crawl/probe-v2.js
 *   node scripts/albumaty-crawl/probe-v2.js --albumaty-id=123
 *   node scripts/albumaty-crawl/probe-v2.js --albumaty-id=123 --max=5
 *   node scripts/albumaty-crawl/probe-v2.js --albumaty-id=123 --skip-albums
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, 'output');
const MP3_DIR   = join(OUT_DIR, 'mp3');
const CLIP_DIR  = join(OUT_DIR, 'clips');

const ARTISTS_FILE = join(__dirname, 'artists.json');
const TRACKS_FILE  = join(__dirname, 'tracks.json');
const SINGERS_FILE = join(OUT_DIR, 'albumaty-singers.json');

const BASE = 'https://www.albumaty.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'ar,en;q=0.9',
};

const DELAY_MS = 600;
const CLIP_SECONDS = 10;

const DEBUG_ARTIST = process.env.DEBUG_ARTIST === '1';

/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function debugString(label, s) {
  if (!DEBUG_ARTIST) return;
  const cps = [...String(s ?? '')]
    .map(c => c.codePointAt(0).toString(16).padStart(4, '0'))
    .join(' ');
  console.log(`[debug] ${label}: ${JSON.stringify(s)}  cps=[${cps}] len=${String(s ?? '').length}`);
}

/**
 * Normalize a track or artist name.
 *
 *   "اغنية يا بخته"     → "يابخته"
 *   "يابخته"           → "يابخته"
 *   "ھلونھم"           → "هلونهم"      (heh goal → heh)
 *   "١٢ بالليل"        → "12بالليل"     (Arabic-Indic digits → Western)
 *   "۱۲ بالليل"        → "12بالليل"     (Persian digits → Western)
 *   "عبد الحليم"       → "عبدالحليم"    (spaces removed)
 */
function normalizeName(s) {
  if (!s) return '';
  let out = String(s);

  // 1. Unicode canonical composition
  try { out = out.normalize('NFC'); } catch { /* ignore */ }

  // 2. Byte order mark and zero-width chars
  out = out.replace(/\uFEFF/g, '');
  out = out.replace(/[\u200C\u200D]/g, '');

  // 3. All whitespace variants → plain space
  out = out.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');

  // 4. Arabic diacritics and tatweel
  out = out.replace(/[\u064B-\u065F\u0670]/g, '');
  out = out.replace(/\u0640/g, '');

  // 5. Letter variant unification
  out = out.replace(/[\u0622\u0623\u0625]/g, '\u0627'); // آ أ إ → ا
  out = out.replace(/[\u0649\u0626\u06CC]/g, '\u064A'); // ى ئ ی → ي
  out = out.replace(/[\u06BE\u06C1\u06D2]/g, '\u0647'); // ھ ہ ے → ه
  out = out.replace(/[\u06A9]/g, '\u0643');              // ک → ك
  out = out.replace(/\u0629/g, '\u0647');                // ة → ه

  // 6. Arabic-Indic and Persian digits → Western
  out = out.replace(/[\u0660-\u0669]/g, d =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30));
  out = out.replace(/[\u06F0-\u06F9]/g, d =>
    String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30));

  // 7. Drop everything that isn't a letter or digit (removes spaces too)
  out = out.replace(/[^\p{L}\p{Nd}]+/gu, '');

  // 8. Strip the leading "اغنية" / "اغنيه"
  out = out.replace(/^اغني[هة]/, '');

  return out;
}

/**
 * Normalize an album name for comparison.
 *
 *   "البوم ابتدينا"              → "ابتدينا"
 *   "عمرو دياب ابتدينا 2025"     → "ابتدينا"
 */
function normalizeAlbum(album, artist) {
  if (!album) return '';
  let out = String(album);

  try { out = out.normalize('NFC'); } catch { /* ignore */ }
  out = out.replace(/\uFEFF/g, '');
  out = out.replace(/[\u200C\u200D]/g, '');
  out = out.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');

  out = out.replace(/[\u064B-\u065F\u0670]/g, '');
  out = out.replace(/\u0640/g, '');
  out = out.replace(/[\u0622\u0623\u0625]/g, '\u0627');
  out = out.replace(/[\u0649\u0626\u06CC]/g, '\u064A');
  out = out.replace(/[\u06BE\u06C1\u06D2]/g, '\u0647');
  out = out.replace(/[\u06A9]/g, '\u0643');
  out = out.replace(/\u0629/g, '\u0647');

  out = out.replace(/[\u0660-\u0669]/g, d =>
    String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30));
  out = out.replace(/[\u06F0-\u06F9]/g, d =>
    String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 0x30));

  out = out.replace(/\d+/g, '');                        // strip digits (years)
  out = out.replace(/[^\p{L}\p{Nd}]+/gu, '');           // drop spaces/punct

  out = out.replace(/^البومات/, '');
  out = out.replace(/^البوم/, '');

  if (artist) {
    const normArtist = normalizeName(artist);
    if (normArtist && out.startsWith(normArtist)) {
      out = out.slice(normArtist.length);
    }
  }

  return out;
}

/* ═══════════════════════════════════════════════════════════
   Load inputs
   ═══════════════════════════════════════════════════════════ */

function unwrapWrangler(json) {
  if (Array.isArray(json) && json[0]?.results) return json[0].results;
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

async function loadArtists() {
  const raw = JSON.parse(await readFile(ARTISTS_FILE, 'utf8'));
  return unwrapWrangler(raw);
}

async function loadTracks() {
  const raw = JSON.parse(await readFile(TRACKS_FILE, 'utf8'));
  return unwrapWrangler(raw);
}

async function loadSingers() {
  const raw = JSON.parse(await readFile(SINGERS_FILE, 'utf8'));
  return raw.singers ?? [];
}

/* ═══════════════════════════════════════════════════════════
   Page parsing
   ═══════════════════════════════════════════════════════════ */

function parseArtistPage(html, artistName) {
  let image = null;
  let fallbackImage = null;
  const imgRe = /<img\s+src="(https:\/\/www\.albumaty\.com\/uploads\/(?:cdnimg|albums)\/[^"]+)"[^>]*alt="([^"]*)"/g;
  for (const m of html.matchAll(imgRe)) {
    const src = m[1];
    const alt = cleanText(m[2]);
    if (alt === artistName) { image = src; break; }
    if (!fallbackImage && src.includes('/cdnimg/')) fallbackImage = src;
  }
  if (!image) image = fallbackImage;

  const albums = [];
  const albumBlock = html.match(/<div class="singer-albums">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (albumBlock) {
    const items = [...albumBlock[1].matchAll(
      /<li[^>]*>\s*<a href="(https:\/\/www\.albumaty\.com\/album\/(\d+)\.html)">([\s\S]*?)<\/a>\s*<\/li>/g
    )];
    for (const m of items) {
      const raw = m[3]
        .replace(/<img[^>]*>/g, '')
        .replace(/<small[^>]*>[^<]*<\/small>/g, '');
      const name = cleanText(raw).replace(/^ألبوم\s+/, '');
      albums.push({ id: Number(m[2]), name, url: m[1] });
    }
  }

  const songs = [];
  const songBlock = html.match(/<div class="singer-songs">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (songBlock) {
    const items = [...songBlock[1].matchAll(
      /<a href="(https:\/\/www\.albumaty\.com\/song\/(\d+)\.html)">([\s\S]*?)<\/a>/g
    )];
    for (const m of items) {
      songs.push({ id: Number(m[2]), name: cleanText(m[3]), url: m[1] });
    }
  }

  return { image, albums, songs };
}

function parseAlbumPage(html) {
  let albumName = null;
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (h2) {
    const raw = h2[1]
      .replace(/<a[^>]*>/g, '')
      .replace(/<\/a>/g, '')
      .replace(/<[^>]+>/g, '');
    const cleaned = cleanText(raw)
      .replace(/^اغاني\s+/, '')
      .replace(/^البوم\s+/, '')
      .replace(/كاملة\s*$/, '')
      .trim();
    if (cleaned) albumName = cleaned;
  }

  const songs = [];
  const songMatches = [...html.matchAll(
    /<a href="(https:\/\/www\.albumaty\.com\/song\/(\d+)\.html)">([\s\S]*?)<\/a>/g
  )];
  for (const m of songMatches) {
    songs.push({ id: Number(m[2]), name: cleanText(m[3]), url: m[1] });
  }

  return { albumName, songs };
}

function parseSongPage(html) {
  const m = html.match(/https?:\/\/serv\d+\.albumaty\.com\/[^\s"'<>]+\.mp3/);
  if (m) return m[0];
  const m2 = html.match(/https?:\/\/[^\s"'<>]+\.mp3/);
  return m2 ? m2[0] : null;
}

/* ═══════════════════════════════════════════════════════════
   Downloads & FFmpeg
   ═══════════════════════════════════════════════════════════ */

async function downloadFile(url, outPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': BASE + '/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return buf.length;
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: 'ignore' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
    child.on('error', reject);
  });
}

async function probeDuration(inputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.on('exit', code => {
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}`));
      const dur = parseFloat(out.trim());
      if (!Number.isFinite(dur)) return reject(new Error('ffprobe returned invalid duration'));
      resolve(dur);
    });
    child.on('error', reject);
  });
}

async function trimClip(inputPath, outPath, startSec, seconds) {
  await ffmpeg([
    '-ss', String(startSec),
    '-i', inputPath,
    '-t', String(seconds),
    '-acodec', 'libmp3lame',
    '-ab', '24k',
    '-ac', '1',
    '-ar', '22050',
    '-compression_level', '9',
    '-y',
    outPath,
  ]);
}

/* ═══════════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  await mkdir(MP3_DIR,  { recursive: true });
  await mkdir(CLIP_DIR, { recursive: true });

  // ── CLI args ──
  const cliAlbumatyId = (() => {
    const a = process.argv.find(x => x.startsWith('--albumaty-id='));
    return a ? Number(a.split('=')[1]) : null;
  })();
  const cliMax = (() => {
    const a = process.argv.find(x => x.startsWith('--max='));
    return a ? Math.max(1, Number(a.split('=')[1])) : 3;
  })();
  const skipAlbums = process.argv.includes('--skip-albums');

  // ── Load inputs ──
  console.log('Loading inputs...');
  const d1Artists = await loadArtists();
  const d1Tracks  = await loadTracks();
  const albumatySingers = await loadSingers();

  console.log(`  D1 artists      : ${d1Artists.length}`);
  console.log(`  D1 tracks       : ${d1Tracks.length}`);
  console.log(`  Albumaty singers: ${albumatySingers.length}`);

  // ── Build lookups ──
  const d1ArtistByName = new Map();
  for (const a of d1Artists) {
    const k = normalizeName(a.artist_name);
    if (!k) continue;
    if (!d1ArtistByName.has(k)) d1ArtistByName.set(k, a);
  }

  const d1TrackKeys = new Set();
  const d1AlbumsByTrackKey = new Map();

  for (const t of d1Tracks) {
    const k = `${t.artist_id}::${normalizeName(t.track_name)}`;
    d1TrackKeys.add(k);

    if (t.album_name) {
      const albums = d1AlbumsByTrackKey.get(k) ?? new Set();
      albums.add(t.album_name);
      d1AlbumsByTrackKey.set(k, albums);
    }
  }

  console.log(`  D1 track keys   : ${d1TrackKeys.size}`);

  if (DEBUG_ARTIST) {
    const artist9Keys = [...d1TrackKeys].filter(k => k.startsWith('9::'));
    console.log(`[debug] Keys with "9::" prefix: ${artist9Keys.length}`);
    console.log(`[debug] Sample 9:: keys:`);
    artist9Keys.slice(0, 5).forEach(k => console.log(`         ${JSON.stringify(k)}`));
    console.log(`[debug] Has "9::شايفقمر"     : ${d1TrackKeys.has('9::شايفقمر')}`);
    console.log(`[debug] Has "9::خطفوني"      : ${d1TrackKeys.has('9::خطفوني')}`);
  }

  // ── Random pool ──
  const pool = [];
  for (const s of albumatySingers) {
    pool.push({ source: 'albumaty', albumatyId: s.id, albumatyName: s.name });
  }
  const albumatyNamesNorm = new Set(albumatySingers.map(s => normalizeName(s.name)));
  for (const a of d1Artists) {
    const k = normalizeName(a.artist_name);
    if (albumatyNamesNorm.has(k)) continue;
    pool.push({ source: 'd1', d1Id: a.artist_id, albumatyName: a.artist_name });
  }

  console.log(`\nRandom pool size: ${pool.length}`);

  // ── Pick ──
  let pick;
  if (cliAlbumatyId != null) {
    const match = albumatySingers.find(s => s.id === cliAlbumatyId);
    if (!match) {
      console.error(`No albumaty singer with id ${cliAlbumatyId}`);
      process.exit(1);
    }
    pick = { source: 'albumaty', albumatyId: match.id, albumatyName: match.name };
    console.log(`Forced pick: ${pick.albumatyName} (albumaty id ${pick.albumatyId})`);
  } else {
    pick = pool[Math.floor(Math.random() * pool.length)];
    console.log(`Random pick: ${pick.albumatyName} (${pick.source})`);
  }

  // ── Resolve albumaty ID ──
  let albumatyId = pick.albumatyId;
  if (!albumatyId) {
    const target = normalizeName(pick.albumatyName);
    const candidate = albumatySingers.find(s => normalizeName(s.name) === target);
    if (candidate) {
      albumatyId = candidate.id;
      console.log(`  Matched to albumaty id ${albumatyId}`);
    } else {
      console.log(`  ✗ No albumaty match for "${pick.albumatyName}" — aborting`);
      process.exit(0);
    }
  }

  // ── Artist match against D1 ──
  const normPicked = normalizeName(pick.albumatyName);

  debugString('pick.albumatyName (raw)', pick.albumatyName);
  debugString('normPicked', normPicked);

  const matchedD1 = d1ArtistByName.get(normPicked);

  const discoveredArtists = [];
  if (!matchedD1) {
    discoveredArtists.push({
      uuid: randomUUID(),
      name: pick.albumatyName,
      albumaty_id: albumatyId,
      genre_ids: [45],
      image: null, // filled below after fetching the page
    });
    console.log(`  → New artist (not in D1)`);
  } else {
    console.log(`  → Matched D1 artist #${matchedD1.artist_id} (${matchedD1.artist_name})`);
  }

  const artistIdForKey = matchedD1?.artist_id ?? null;

  // ── Fetch artist page ──
  const artistUrl = `${BASE}/singer/${albumatyId}.html`;
  console.log(`\nFetching ${artistUrl}`);
  const artistHtml = await fetchHtml(artistUrl);
  const { image, albums, songs } = parseArtistPage(artistHtml, pick.albumatyName);

  console.log(`  Image  : ${image ?? '(none)'}`);
  console.log(`  Albums : ${albums.length}`);
  console.log(`  Songs  : ${songs.length}`);

  if (discoveredArtists.length > 0) {
    discoveredArtists[0].image = image;
  }

  // ── Build song_id → album_name map ──
  let albumNameBySongId = new Map();

  if (artistIdForKey != null && !skipAlbums && albums.length > 0) {
    console.log(`\nCrawling ${albums.length} album pages to build song→album map...`);
    for (let i = 0; i < albums.length; i++) {
      const album = albums[i];
      try {
        const albumHtml = await fetchHtml(album.url);
        const { albumName, songs: albumSongs } = parseAlbumPage(albumHtml);
        if (albumName) {
          for (const s of albumSongs) {
            if (!albumNameBySongId.has(s.id)) {
              albumNameBySongId.set(s.id, albumName);
            }
          }
        }
        if ((i + 1) % 10 === 0 || i === albums.length - 1) {
          console.log(`  [${i + 1}/${albums.length}] mapped ${albumNameBySongId.size} songs`);
        }
      } catch (e) {
        console.log(`  ✗ album ${album.id}: ${e.message}`);
      }
      await sleep(DELAY_MS);
    }
    console.log(`  Mapped ${albumNameBySongId.size} songs across ${albums.length} albums`);
  } else if (artistIdForKey != null && skipAlbums) {
    console.log(`\n--skip-albums: no album pages crawled. Album names on output will be null.`);
  }

  // ── Classify ──
  const seen = new Set();
  const newTracks = [];
  const needsAlbum = [];
  const albumMismatch = [];
  let alreadyComplete = 0;

  for (const song of songs) {
    const k = normalizeName(song.name);
    if (seen.has(k)) continue;
    seen.add(k);

    if (artistIdForKey == null) {
      newTracks.push(song);
      continue;
    }

    const key = `${artistIdForKey}::${k}`;
    const inD1 = d1TrackKeys.has(key);
    if (!inD1) {
      newTracks.push(song);
      continue;
    }

    const existingAlbums = d1AlbumsByTrackKey.get(key);
    if (!existingAlbums || existingAlbums.size === 0) {
      needsAlbum.push({ ...song, existingAlbums: [] });
      continue;
    }

    const albumatyAlbum = albumNameBySongId.get(song.id) ?? null;

    if (!albumatyAlbum) {
      alreadyComplete++;
      continue;
    }

    const albumatyAlbumNorm = normalizeAlbum(albumatyAlbum, pick.albumatyName);
    const hasMatch = [...existingAlbums].some(a =>
      normalizeAlbum(a, pick.albumatyName) === albumatyAlbumNorm
    );

    if (hasMatch) {
      alreadyComplete++;
    } else {
      albumMismatch.push({
        ...song,
        existingAlbums: [...existingAlbums],
        albumatyAlbum,
      });
    }
  }

  console.log(`\nClassification:`);
  console.log(`  New tracks         : ${newTracks.length}`);
  console.log(`  Needs album        : ${needsAlbum.length}`);
  console.log(`  Album mismatch     : ${albumMismatch.length}`);
  console.log(`  Already complete   : ${alreadyComplete}`);

  if (DEBUG_ARTIST && newTracks.length > 0) {
    console.log(`[debug] First 20 "new" tracks and their normalized forms:`);
    newTracks.slice(0, 20).forEach(s => {
      const norm = normalizeName(s.name);
      const key = `${artistIdForKey}::${norm}`;
      console.log(`         ${JSON.stringify(s.name)} → ${JSON.stringify(norm)}  key=${JSON.stringify(key)}  inSet=${d1TrackKeys.has(key)}`);
    });
  }

  // ── Build backfill entries ──
  const albumBackfill = [
    ...needsAlbum.map(s => ({
      artist_id: artistIdForKey,
      albumaty_id: albumatyId,
      song_id: s.id,
      track_name: s.name,
      album_name: albumNameBySongId.get(s.id) ?? null,
      reason: 'album-missing',
      existing_albums_in_d1: s.existingAlbums,
    })),
    ...albumMismatch.map(s => ({
      artist_id: artistIdForKey,
      albumaty_id: albumatyId,
      song_id: s.id,
      track_name: s.name,
      album_name: s.albumatyAlbum,
      reason: 'album-mismatch',
      existing_albums_in_d1: s.existingAlbums,
    })),
  ];

  // ── Download + trim new tracks ──
  console.log(`\nProcessing up to ${cliMax} new tracks this run...`);
  const newTracksOut = [];
  const toProcess = newTracks.slice(0, cliMax);

  for (const song of toProcess) {
    console.log(`\n  → [${song.id}] ${song.name}`);

    try {
      const songHtml = await fetchHtml(song.url);
      const mp3Url = parseSongPage(songHtml);
      if (!mp3Url) {
        console.log(`     ✗ no MP3 URL`);
        continue;
      }
      console.log(`     MP3: ${mp3Url}`);

      const safe = String(song.name).replace(/[^\p{L}\p{N}\-]+/gu, '_').slice(0, 50);
      const fullPath = join(MP3_DIR, `${albumatyId}-${song.id}-${safe}.mp3`);
      const bytes = await downloadFile(mp3Url, fullPath);
      console.log(`     ✓ downloaded ${(bytes / 1024).toFixed(1)} KB`);

      let duration;
      try { duration = await probeDuration(fullPath); }
      catch (e) { console.log(`     ✗ probe failed: ${e.message}`); continue; }

      const startClip = join(CLIP_DIR, `${albumatyId}-${song.id}-start-${CLIP_SECONDS}s.mp3`);
      const midClip   = join(CLIP_DIR, `${albumatyId}-${song.id}-middle-${CLIP_SECONDS}s.mp3`);

      const midStart = Math.max(0, Math.floor((duration - CLIP_SECONDS) / 2));

      await trimClip(fullPath, startClip, 0, CLIP_SECONDS);
      await trimClip(fullPath, midClip,   midStart, CLIP_SECONDS);

      console.log(`     ✓ trimmed (duration ${duration.toFixed(1)}s, middle starts at ${midStart}s)`);

      newTracksOut.push({
        artist_id: artistIdForKey,
        albumaty_id: albumatyId,
        song_id: song.id,
        song_name: song.name,
        album_name: albumNameBySongId.get(song.id) ?? null,
        mp3_url: mp3Url,
        duration_sec: duration,
        clips: {
          start:  { path: startClip, start_sec: 0,        duration: CLIP_SECONDS },
          middle: { path: midClip,   start_sec: midStart, duration: CLIP_SECONDS },
        },
      });

      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`     ✗ ${e.message}`);
    }
  }

  // ── Write outputs ──
  const report = {
    generatedAt: new Date().toISOString(),
    picked: {
      source: pick.source,
      name: pick.albumatyName,
      albumaty_id: albumatyId,
      matched_d1_artist_id: artistIdForKey,
    },
    artistPage: {
      image,
      albumsFound: albums.length,
      songsFound: songs.length,
    },
    counts: {
      new: newTracks.length,
      needsAlbum: needsAlbum.length,
      albumMismatch: albumMismatch.length,
      alreadyComplete,
    },
    discoveredArtists,
    newTracksProcessed: newTracksOut.length,
    newTracks: newTracksOut,
    albumBackfill,
    // include the full list of "new" names for debugging
    newTracksAllNames: newTracks.map(s => s.name),
  };

  const reportPath   = join(OUT_DIR, 'probe-report-v2.json');
  const discPath     = join(OUT_DIR, 'discovered-artists.json');
  const missPath     = join(OUT_DIR, 'missing-tracks.json');
  const backfillPath = join(OUT_DIR, 'album-backfill.json');

  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  await writeFile(discPath,   JSON.stringify({ generatedAt: report.generatedAt, artists: discoveredArtists }, null, 2), 'utf8');
  await writeFile(missPath,   JSON.stringify({ generatedAt: report.generatedAt, tracks: newTracksOut }, null, 2), 'utf8');
  await writeFile(backfillPath, JSON.stringify({ generatedAt: report.generatedAt, tracks: albumBackfill }, null, 2), 'utf8');

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Done');
  console.log('═'.repeat(60));
  console.log(`Picked artist           : ${pick.albumatyName} (${pick.source})`);
  console.log(`Matched D1 artist       : ${artistIdForKey != null ? `#${artistIdForKey} (${matchedD1.artist_name})` : 'none (new)'}`);
  console.log(`Songs on albumaty       : ${songs.length}`);
  console.log(`  → new                 : ${newTracks.length}`);
  console.log(`  → needs album         : ${needsAlbum.length}`);
  console.log(`  → album mismatch      : ${albumMismatch.length}`);
  console.log(`  → already complete    : ${alreadyComplete}`);
  console.log(`New tracks processed    : ${newTracksOut.length}`);
  console.log(`Discovered new artists  : ${discoveredArtists.length}`);
  console.log('');
  console.log(`Report   : ${reportPath}`);
  console.log(`Artists  : ${discPath}`);
  console.log(`Missing  : ${missPath}`);
  console.log(`Backfill : ${backfillPath}`);
  console.log(`MP3s     : ${MP3_DIR}`);
  console.log(`Clips    : ${CLIP_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});