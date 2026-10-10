// server/scripts/youtube/extract-playlist.js
//
// Given a playlist or single-video URL, print a JSON array of videos.
// Uses --flat-playlist for speed: one request for the whole list,
// no per-video metadata fetch.
//
// Usage:
//   node extract-playlist.js "<url>" > playlist.json

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
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
const YTDLP_CMD  = process.env.YTDLP_PATH ?? (IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node extract-playlist.js "<playlist-or-video-url>"');
  process.exit(1);
}

const args = [
  '--flat-playlist',
  '--dump-json',
  '--no-warnings',
  url,
];

const child = spawn(YTDLP_CMD, args, { stdio: ['ignore', 'pipe', 'inherit'] });

let buffer = '';
const videos = [];

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    videos.push({
      index:       videos.length + 1,
      videoId:     obj.id ?? null,
      title:       obj.title ?? '(untitled)',
      durationSec: obj.duration ?? null,
      url:         obj.url ?? (obj.id ? `https://www.youtube.com/watch?v=${obj.id}` : null),
      uploader:    obj.uploader ?? obj.channel ?? null,
    });
  }
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`yt-dlp exited with code ${code}`);
    process.exit(code);
  }
  console.log(JSON.stringify(videos, null, 2));
});