// server/scripts/instrumental/batch.js
//
// Child process: produce instrumental segments for a batch of tracks.
//
// Pipeline per track:
//   1. Download full song → source.mp3
//   2. ffprobe → duration
//   3. For each placement (middle @ 48%, custom @ 52%):
//        a. ffmpeg cut 10s raw WAV slice (stereo, 44.1k)
//        b. demucs --two-stems=vocals on that 10s slice
//        c. convert no_vocals.wav → mono MP3 (64k)
//   4. Write meta.json
//
// Emits JSON lines on stdout, one per event:
//   { stage: 'start',          done: 0, total }
//   { stage: 'track-start',    index, total, trackName, artistName }
//   { stage: 'download',       index, bytes, trackName }
//   { stage: 'cut',            index, seg, phase: 'raw', start, end }
//   { stage: 'demucs-start',   index, seg }
//   { stage: 'demucs-done',    index, seg, elapsedMs }
//   { stage: 'cut',            index, seg, phase: 'final', start }
//   { stage: 'track-done',     done, total, summary }
//   { stage: 'track-failed',   done, total, summary, error }
//   { stage: 'done',           done, total, status: 'done', summary, manifestPath }

import { spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, writeFileSync, readFileSync,
  createWriteStream, rmSync, statSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import { trackOutputDir, OUTPUT_ROOT } from './paths.js';

/* ── Config ────────────────────────────────────────────── */
const SEGMENT_LENGTH = 10;   // seconds per output clip
const PLACEMENTS = [
  { seg: 'middle', ratio: 0.48 },
  { seg: 'custom', ratio: 0.52 },
];

/* ── Args ──────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = {
    tracksFile: null,
    segmentLength: SEGMENT_LENGTH,
    bitrate: '64k',
  };
  for (const a of argv) {
    if (a.startsWith('--tracks-file='))    out.tracksFile    = a.slice('--tracks-file='.length);
    if (a.startsWith('--segment-length=')) out.segmentLength = Number(a.slice('--segment-length='.length));
    if (a.startsWith('--bitrate='))        out.bitrate       = a.slice('--bitrate='.length);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.tracksFile || !existsSync(args.tracksFile)) {
  console.error('Missing or invalid --tracks-file');
  process.exit(1);
}

const tracks = JSON.parse(readFileSync(args.tracksFile, 'utf8'));
if (!Array.isArray(tracks) || tracks.length === 0) {
  console.error('Tracks file is empty or not an array');
  process.exit(1);
}

/* ── Commands from env ─────────────────────────────────── */
const PYTHON_CMD = process.env.PYTHON_PATH
  ?? resolve(process.cwd(), 'venv', 'Scripts', 'python.exe');
const FFMPEG_CMD = process.env.FFMPEG_PATH
  ?? 'C:\\Tools\\ffmpeg\\bin\\ffmpeg.exe';
const FFPROBE_CMD = FFMPEG_CMD.replace(/ffmpeg\.exe$/i, 'ffprobe.exe');

const MATB3AA_AUDIO_BASE =
  process.env.MATB3AA_BASE ?? 'https://www.matb3aa.com';
const USER_AGENT = process.env.USER_AGENT
  ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

/* ── Temp dir ──────────────────────────────────────────── */
const TMP_DIR = resolve(process.cwd(), 'server', 'tmp-preview-test', `instr-${randomUUID()}`);
mkdirSync(TMP_DIR, { recursive: true });
mkdirSync(OUTPUT_ROOT, { recursive: true });

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/* ── Helpers ───────────────────────────────────────────── */
function absolutizeSrc(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${MATB3AA_AUDIO_BASE.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
}

function run(cmd, argsArr, opts = {}) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, argsArr, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr?.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('error', rejectP);
    child.on('exit', (code) => {
      if (code === 0) resolveP({ stdout, stderr });
      else rejectP(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

async function download(rawUrl, destPath) {
  const url = absolutizeSrc(rawUrl);
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': `${MATB3AA_AUDIO_BASE.replace(/\/$/, '')}/`,
    },
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return destPath;
}

async function getDuration(path) {
  const { stdout } = await run(FFPROBE_CMD, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ]);
  const dur = parseFloat(stdout.trim());
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error(`Invalid duration for ${path}: ${stdout}`);
  }
  return dur;
}

/* ── Per-track processing ──────────────────────────────── */
async function processTrack(track, index, total) {
  const t0 = Date.now();
  const trackTmp = join(TMP_DIR, `t-${index}-${randomUUID()}`);
  mkdirSync(trackTmp, { recursive: true });

  const sourceFile = join(trackTmp, 'source.mp3');

  emit({
    stage: 'track-start',
    index, total,
    trackName: track.trackName,
    artistName: track.artistName,
  });

  // 1. Download full song
  await download(track.src, sourceFile);
  let bytes = 0;
  try { bytes = statSync(sourceFile).size; } catch { /* ignore */ }
  emit({ stage: 'download', index, bytes, trackName: track.trackName });

  // 2. Duration
  const duration = await getDuration(sourceFile);

  // 3. Output folder for this track
  const outDir = trackOutputDir(track.artistId, track.artistName, track.trackName);
  mkdirSync(outDir, { recursive: true });

  // 4. For each placement: cut → demucs → save MP3
  const produced = [];

  for (let i = 0; i < PLACEMENTS.length; i++) {
    const { seg, ratio } = PLACEMENTS[i];

    let start = Math.max(0, duration * ratio - SEGMENT_LENGTH / 2);
    if (start + SEGMENT_LENGTH > duration) {
      start = Math.max(0, duration - SEGMENT_LENGTH);
    }

    // 4a. Cut raw 10s slice
    const rawSlice = join(trackTmp, `raw_${seg}.wav`);
    await run(FFMPEG_CMD, [
      '-y',
      '-ss', start.toFixed(3),
      '-t', SEGMENT_LENGTH.toFixed(3),
      '-i', sourceFile,
      '-ac', '2',
      '-ar', '44100',
      rawSlice,
    ]);
    emit({ stage: 'cut', index, seg, phase: 'raw', start, end: start + SEGMENT_LENGTH });

    // 4b. Demucs on the 10s slice
    const demucsOut = join(trackTmp, `demucs_${seg}`);
    const demucsT0 = Date.now();
    emit({ stage: 'demucs-start', index, seg });

    await run(PYTHON_CMD, [
      '-m', 'demucs',
      '--two-stems=vocals',
      '-o', demucsOut,
      rawSlice,
    ]);

    emit({ stage: 'demucs-done', index, seg, elapsedMs: Date.now() - demucsT0 });

    const stemName = rawSlice.replace(/^.*[\\\/]/, '').replace(/\.[^.]+$/, '');
    const noVocals = join(demucsOut, 'htdemucs', stemName, 'no_vocals.wav');
    const vocalsFile = join(demucsOut, 'htdemucs', stemName, 'vocals.wav');

    if (!existsSync(noVocals)) {
      throw new Error(`demucs did not produce no_vocals.wav for ${seg} at ${noVocals}`);
    }
    if (existsSync(vocalsFile)) {
      try { rmSync(vocalsFile); } catch { /* ignore */ }
    }

    // 4c. Convert to mono MP3 at 64k
    const out = join(outDir, `seg_${seg}.mp3`);
    await run(FFMPEG_CMD, [
      '-y',
      '-i', noVocals,
      '-ac', '1',
      '-codec:a', 'libmp3lame',
      '-b:a', args.bitrate,
      out,
    ]);

    produced.push({
      seg,
      ratio,
      originalStartSec: Number(start.toFixed(3)),
      originalEndSec: Number((start + SEGMENT_LENGTH).toFixed(3)),
      file: `seg_${seg}.mp3`,
    });
    emit({ stage: 'cut', index, seg, phase: 'final', start });
  }

  // 5. meta.json
  const meta = {
    artistId: track.artistId,
    artistName: track.artistName,
    trackId: track.trackId,
    trackName: track.trackName,
    albumName: track.albumName ?? null,
    sourceUrl: absolutizeSrc(track.src),
    sourceDurationSec: Number(duration.toFixed(2)),
    segmentLengthSec: SEGMENT_LENGTH,
    bitrate: args.bitrate,
    mono: true,
    pipeline: 'cut-then-separate-per-segment',
    placements: PLACEMENTS,
    segments: produced,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  try { rmSync(trackTmp, { recursive: true, force: true }); } catch { /* ignore */ }

  return { segments: produced, elapsedMs: Date.now() - t0 };
}

/* ── Main loop ─────────────────────────────────────────── */
(async () => {
  const t0 = Date.now();
  const total = tracks.length;

  emit({ stage: 'start', done: 0, total });

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const track = tracks[i];
    try {
      await processTrack(track, i, total);
      succeeded += 1;
      emit({
        stage: 'track-done',
        done: i + 1,
        total,
        summary: { total, succeeded, failed },
      });
    } catch (e) {
      failed += 1;
      emit({
        stage: 'track-failed',
        done: i + 1,
        total,
        summary: { total, succeeded, failed },
        error: e.message,
      });
      console.error(`[track ${i}] failed:`, e.message);
    }
  }

  const manifestPath = join(OUTPUT_ROOT, 'manifest.json');
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalTracks: total,
    succeeded,
    failed,
    segmentLengthSec: args.segmentLength,
    bitrate: args.bitrate,
    placements: PLACEMENTS,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  emit({
    stage: 'done',
    done: total,
    total,
    status: 'done',
    summary: { total, succeeded, failed },
    manifestPath,
  });

  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
})();