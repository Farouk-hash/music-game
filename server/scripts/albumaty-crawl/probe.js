// server/scripts/albumaty-crawl/probe.js
/**
 * One-shot probe: crawl two albumaty artists, take their first album
 * plus two songs from it, plus two songs from the all-songs list,
 * fetch each song page for the MP3 URL, and download the files.
 *
 * Not a production crawler. Just a look at what the data looks like.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, 'output');
const MP3_DIR   = join(OUT_DIR, 'mp3');

const BASE = 'https://www.albumaty.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,en;q=0.9',
};

const DELAY_MS = 600;

// Test targets — pick small/older artists so the crawl is fast
const TARGETS = [
  { id: 123,  name: 'عمرو دياب' },      // big, well-known
  { id: 1052, name: 'عصام صاصا' },      // smaller
];

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
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ═══════════════════════════════════════════════════════════
   Step 1 — parse artist page
   Returns { albums: [...], songs: [...] }
   ═══════════════════════════════════════════════════════════ */

function parseArtistPage(html) {
  const albums = [];
  const songs  = [];

  // ── Albums ──
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
      albums.push({
        id: Number(m[2]),
        name,
        url: m[1],
      });
    }
  }

  // ── Songs ──
  const songBlock = html.match(/<div class="singer-songs">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (songBlock) {
    const items = [...songBlock[1].matchAll(
      /<a href="(https:\/\/www\.albumaty\.com\/song\/(\d+)\.html)">([\s\S]*?)<\/a>/g
    )];
    for (const m of items) {
      const name = cleanText(m[3]);
      songs.push({
        id: Number(m[2]),
        name,
        url: m[1],
      });
    }
  }

  return { albums, songs };
}

/* ═══════════════════════════════════════════════════════════
   Step 2 — parse song page for MP3 URL
   ═══════════════════════════════════════════════════════════ */

function parseSongPage(html) {
  // MP3 URL pattern seen: https://serv100.albumaty.com/dl/.../*.mp3
  const m = html.match(/https?:\/\/serv\d+\.albumaty\.com\/[^\s"'<>]+\.mp3/);
  if (m) return m[0];

  // Fallback: any .mp3 URL
  const m2 = html.match(/https?:\/\/[^\s"'<>]+\.mp3/);
  return m2 ? m2[0] : null;
}

/* ═══════════════════════════════════════════════════════════
   Step 3 — download MP3 bytes
   ═══════════════════════════════════════════════════════════ */

async function downloadMp3(url, outPath) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': HEADERS['User-Agent'],
      'Referer': 'https://www.albumaty.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return buf.length;
}

/* ═══════════════════════════════════════════════════════════
   Main
   ═══════════════════════════════════════════════════════════ */

async function main() {
  await mkdir(MP3_DIR, { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    artists: [],
    downloads: [],
    errors: [],
  };

  for (const target of TARGETS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Artist: ${target.name} (id ${target.id})`);
    console.log('═'.repeat(60));

    const artistEntry = {
      id: target.id,
      name: target.name,
      albumsFound: 0,
      songsFound: 0,
      firstAlbum: null,
      albumSongsSelected: [],
      allSongsSelected: [],
    };

    try {
      // ── Fetch artist page ──
      const artistUrl = `${BASE}/singer/${target.id}.html`;
      console.log(`  Fetching ${artistUrl}`);
      const artistHtml = await fetchHtml(artistUrl);
      const { albums, songs } = parseArtistPage(artistHtml);

      artistEntry.albumsFound = albums.length;
      artistEntry.songsFound = songs.length;
      console.log(`  Albums: ${albums.length}  Songs: ${songs.length}`);

      await sleep(DELAY_MS);

      // ── Fetch first album page, get its track list ──
      let albumSongIds = [];
      if (albums.length > 0) {
        const firstAlbum = albums[0];
        console.log(`  First album: [${firstAlbum.id}] ${firstAlbum.name}`);

        const albumUrl = `${BASE}/album/${firstAlbum.id}.html`;
        console.log(`  Fetching ${albumUrl}`);
        const albumHtml = await fetchHtml(albumUrl);

        // Album page has song links — grab up to 2
        const albumSongs = [...albumHtml.matchAll(
          /<a href="(https:\/\/www\.albumaty\.com\/song\/(\d+)\.html)">([\s\S]*?)<\/a>/g
        )].map(m => ({
          id: Number(m[2]),
          name: cleanText(m[3]),
          url: m[1],
        }));

        // Dedupe by id
        const seen = new Set();
        const uniqueAlbumSongs = [];
        for (const s of albumSongs) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          uniqueAlbumSongs.push(s);
        }

        console.log(`  Album songs: ${uniqueAlbumSongs.length}`);

        artistEntry.firstAlbum = {
          id: firstAlbum.id,
          name: firstAlbum.name,
          url: firstAlbum.url,
          songsFound: uniqueAlbumSongs.length,
        };

        albumSongIds = uniqueAlbumSongs.slice(0, 2);
        artistEntry.albumSongsSelected = albumSongIds.map(s => ({ id: s.id, name: s.name }));

        await sleep(DELAY_MS);
      }

      // ── Take 2 songs from the all-songs list (skip ones already in album selection) ──
      const albumIds = new Set(albumSongIds.map(s => s.id));
      const allSongsSelection = songs
        .filter(s => !albumIds.has(s.id))
        .slice(0, 2);

      artistEntry.allSongsSelected = allSongsSelection.map(s => ({ id: s.id, name: s.name }));

      // ── Fetch each selected song page, extract MP3 URL, download ──
      const toFetch = [...albumSongIds, ...allSongsSelection];
      console.log(`  Songs to download: ${toFetch.length}`);

      for (const song of toFetch) {
        try {
          console.log(`    → [${song.id}] ${song.name}`);
          const songHtml = await fetchHtml(song.url);
          const mp3Url = parseSongPage(songHtml);

          if (!mp3Url) {
            console.log(`      ✗ no MP3 URL found`);
            report.errors.push({ artist: target.name, song: song.name, error: 'no-mp3-url' });
            continue;
          }

          console.log(`      MP3: ${mp3Url}`);

          const safeName = String(song.name)
            .replace(/[^\p{L}\p{N}\-]+/gu, '_')
            .slice(0, 60);
          const outPath = join(MP3_DIR, `${target.id}-${song.id}-${safeName}.mp3`);

          const bytes = await downloadMp3(mp3Url, outPath);
          console.log(`      ✓ saved ${(bytes / 1024).toFixed(1)} KB → ${outPath}`);

          report.downloads.push({
            artistId: target.id,
            artistName: target.name,
            songId: song.id,
            songName: song.name,
            mp3Url,
            localPath: outPath,
            bytes,
          });
        } catch (e) {
          console.log(`      ✗ ${e.message}`);
          report.errors.push({ artist: target.name, song: song.name, error: e.message });
        }

        await sleep(DELAY_MS);
      }

      report.artists.push(artistEntry);
    } catch (e) {
      console.log(`  ✗ artist failed: ${e.message}`);
      report.errors.push({ artist: target.name, error: e.message });
      report.artists.push(artistEntry);
    }

    await sleep(DELAY_MS);
  }

  // ── Write report ──
  const reportPath = join(OUT_DIR, 'probe-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Done');
  console.log('═'.repeat(60));
  console.log(`Artists processed : ${report.artists.length}`);
  console.log(`Songs downloaded  : ${report.downloads.length}`);
  console.log(`Errors            : ${report.errors.length}`);
  console.log(`Report            : ${reportPath}`);
  console.log(`MP3s              : ${MP3_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});