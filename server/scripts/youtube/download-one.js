// server/scripts/youtube/download-one.js
//
// Download a single YouTube video as MP3 into an output folder.
// Useful for verifying the pipeline before running a full playlist.
//
// Usage:
//   node download-one.js "<video-url>" [--out=<dir>]

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

for (const a of argv) {
  if (a.startsWith('--out=')) out = a.slice('--out='.length);
  else if (!url) url = a;
}

if (!url) {
  console.error('Usage: node download-one.js "<video-url>" [--out=<dir>]');
  process.exit(1);
}

const outDir = resolve(out);
mkdirSync(outDir, { recursive: true });

console.log(`yt-dlp:      ${YTDLP_CMD}`);
if (FFMPEG_DIR) console.log(`ffmpeg dir:  ${FFMPEG_DIR}`);
console.log(`Downloading: ${url}`);
console.log(`Output dir:  ${outDir}\n`);

// ── yt-dlp args ────────────────────────────────────────
const args = [
  '-x',
  '--audio-format', 'mp3',
  '--audio-quality', '192K',
  '--no-playlist',
  '-o', '%(title)s.%(ext)s',
  '--print-json',
  '--no-warnings',
];

if (FFMPEG_DIR) {
  args.push('--ffmpeg-location', FFMPEG_DIR);
}

args.push(url);

const child = spawn(YTDLP_CMD, args, {
  cwd: outDir,
  stdio: ['ignore', 'pipe', 'inherit'],
});

let buffer = '';
let finalMeta = null;

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line.startsWith('{')) continue;
    try { finalMeta = JSON.parse(line); } catch { /* ignore */ }
  }
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\nyt-dlp failed (exit ${code})`);
    process.exit(code);
  }
  console.log('\n✓ Downloaded');
  if (finalMeta) {
    console.log(`  Title:    ${finalMeta.title}`);
    console.log(`  Duration: ${finalMeta.duration}s`);
    console.log(`  File:     ${finalMeta._filename ?? '(unknown)'}`);
  }
});