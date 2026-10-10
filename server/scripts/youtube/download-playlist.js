// server/scripts/youtube/download-playlist.js
//
// Download every video in a YouTube playlist as MP3.
// Emits JSON progress lines on stdout:
//   { stage: 'start',      url, outDir }
//   { stage: 'downloaded', entry }
//   { stage: 'done',       exitCode, downloadedCount, manifestPath }
//
// Idempotent: --download-archive skips already-downloaded videos.
//
// Usage:
//   node download-playlist.js "<playlist-url>" [--out=<dir>] [--cookies=chrome|firefox|edge]

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

function loadDotEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(process.cwd(), '..', '..', '..', '.env'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
    break;
  }
}
loadDotEnv();

const IS_WINDOWS = process.platform === 'win32';
const YTDLP_CMD  = process.env.YTDLP_PATH  ?? (IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp');
const FFMPEG_BIN = process.env.FFMPEG_PATH ?? null;
const FFMPEG_DIR = FFMPEG_BIN ? resolve(FFMPEG_BIN, '..') : null;
// ── Parse args ────────────────────────────────────────
const argv = process.argv.slice(2);
let url = null;
let out = './downloads';
let cookiesFrom = null;

for (const a of argv) {
  if (a.startsWith('--out='))          out = a.slice('--out='.length);
  else if (a.startsWith('--cookies=')) cookiesFrom = a.slice('--cookies='.length);
  else if (!url)                       url = a;
}

if (!url) {
  console.error('Usage: node download-playlist.js "<playlist-url>" [--out=<dir>] [--cookies=chrome|firefox|edge]');
  process.exit(1);
}

const outDir = resolve(out);
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'manifest.json');
const archiveFile  = join(outDir, '.archive.txt');

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

emit({ stage: 'start', url, outDir, ytdlp: YTDLP_CMD, ffmpegDir: FFMPEG_DIR });

// ── yt-dlp args ────────────────────────────────────────
const args = [
  '-x',
  '--audio-format', 'mp3',
  '--audio-quality', '192K',
  '--yes-playlist',
  '--download-archive', archiveFile,
  '--print-json',
  '--no-warnings',
  '-o', '%(playlist_index)02d - %(title)s.%(ext)s',
];

if (FFMPEG_DIR)  args.push('--ffmpeg-location', FFMPEG_DIR);
if (cookiesFrom) args.push('--cookies-from-browser', cookiesFrom);

args.push(url);

const child = spawn(YTDLP_CMD, args, {
  cwd: outDir,
  stdio: ['ignore', 'pipe', 'inherit'],
});

// ── Stream metadata ────────────────────────────────────
let buffer = '';
const downloaded = [];

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line.startsWith('{')) continue;

    let meta;
    try { meta = JSON.parse(line); } catch { continue; }

    const entry = {
      index:        meta.playlist_index ?? downloaded.length + 1,
      videoId:      meta.id,
      title:        meta.title,
      uploader:     meta.uploader ?? meta.channel ?? null,
      durationSec:  meta.duration ?? null,
      url:          meta.webpage_url ?? null,
      file:         meta._filename ?? null,
      sizeBytes:    meta.filesize ?? null,
      downloadedAt: new Date().toISOString(),
    };
    downloaded.push(entry);
    emit({ stage: 'downloaded', entry });
  }
});

// ── On exit, merge + write manifest ────────────────────
child.on('exit', (code) => {
  let existing = [];
  if (existsSync(manifestPath)) {
    try { existing = JSON.parse(readFileSync(manifestPath, 'utf8')); }
    catch { existing = []; }
  }
  const byId = new Map();
  for (const e of existing)   if (e.videoId) byId.set(e.videoId, e);
  for (const e of downloaded) if (e.videoId) byId.set(e.videoId, e);

  const merged = [...byId.values()]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  writeFileSync(manifestPath, JSON.stringify(merged, null, 2), 'utf8');

  emit({
    stage: code === 0 ? 'done' : 'failed',
    exitCode: code,
    downloadedCount: downloaded.length,
    manifestPath,
  });
  process.exit(code);
});