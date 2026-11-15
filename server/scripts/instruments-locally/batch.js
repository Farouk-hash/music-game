// server/scripts/instruments-locally/batch.js
//
// Child process: produce no-vocals instrumental output for a batch of
// tracks — full song + 30s slices, kept LOCALLY. No R2, no D1.
//
// Output layout: see paths.js.
//   <ROOT>/<id>_<artistSlug>/<trackSlug>/                    (no album)
//   <ROOT>/<id>_<artistSlug>/<albumSlug>/<trackSlug>/        (with album)
//
// Per-track flow:
//   1. Skip-check (if --skip-existing): folder must have matching
//      schemaVersion + segmentLength + bitrate + sourceDurationSec (±2s)
//      and every listed file must exist. Otherwise regenerate.
//   2. Download full song → source.mp3
//   3. ffprobe → duration  (throws with raw stdout on failure)
//   4. If duration > --max-demucs-sec → chunked demucs, else full demucs.
//   5. Convert no_vocals.wav → full-nv.mp3  (stereo 44.1k, --bitrate)
//   6. Slice no_vocals.wav into N = ceil(duration/segmentLength) parts,
//      each → part-NN-nv.mp3 (stereo 44.1k, --bitrate)
//   7. Write meta.json
//   8. Clean temp dir

import { spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync,
  createWriteStream, rmSync, statSync,
} from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import { trackOutputDir, OUTPUT_ROOT, slugify } from './paths.js';

/* ── Schema ───────────────────────────────────────────── */
const SCHEMA_VERSION = 1;
const DEFAULT_SEGMENT_LENGTH = 30;
const DEFAULT_BITRATE = '192k';
const DEFAULT_MAX_DEMUCS_SEC = 600;
const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 2;
const DURATION_TOLERANCE_SEC = 2;
const STALE_TMP_MAX_AGE_MS = 60 * 60 * 1000;

/* ── Args ─────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = {
    tracksFile: null,
    segmentLength: DEFAULT_SEGMENT_LENGTH,
    bitrate: DEFAULT_BITRATE,
    maxDemucsSec: DEFAULT_MAX_DEMUCS_SEC,
    skipExisting: true,
  };
  for (const a of argv) {
    if (a.startsWith('--tracks-file='))     out.tracksFile    = a.slice('--tracks-file='.length);
    if (a.startsWith('--segment-length='))  out.segmentLength = Number(a.slice('--segment-length='.length));
    if (a.startsWith('--bitrate='))         out.bitrate       = a.slice('--bitrate='.length);
    if (a.startsWith('--max-demucs-sec='))  out.maxDemucsSec  = Number(a.slice('--max-demucs-sec='.length));
    if (a === '--skip-existing=0')          out.skipExisting  = false;
    if (a === '--skip-existing=1')          out.skipExisting  = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.tracksFile || !existsSync(args.tracksFile)) {
  console.error('Missing or invalid --tracks-file');
  process.exit(1);
}
if (!Number.isFinite(args.segmentLength) || args.segmentLength <= 0) {
  console.error('Invalid --segment-length'); process.exit(1);
}
if (!Number.isFinite(args.maxDemucsSec) || args.maxDemucsSec <= 0) {
  console.error('Invalid --max-demucs-sec'); process.exit(1);
}

const tracks = JSON.parse(readFileSync(args.tracksFile, 'utf8'));
if (!Array.isArray(tracks) || tracks.length === 0) {
  console.error('Tracks file is empty or not an array');
  process.exit(1);
}

/* ── Commands from env ────────────────────────────────── */
const PYTHON_CMD = process.env.PYTHON_PATH
  ?? resolve(process.cwd(), 'venv', 'Scripts', 'python.exe');
const FFMPEG_CMD = process.env.FFMPEG_PATH
  ?? 'C:\\Tools\\ffmpeg\\bin\\ffmpeg.exe';
const FFPROBE_CMD = FFMPEG_CMD.replace(/ffmpeg\.exe$/i, 'ffprobe.exe');

const MATB3AA_AUDIO_BASE =
  process.env.MATB3AA_BASE ?? 'https://www.matb3aa.com';
const USER_AGENT = process.env.USER_AGENT
  ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

/* ── Temp dir cleanup (stale only) + create ───────────── */
const BASE_TMP = resolve(process.cwd(), 'server', 'tmp-preview-test');
mkdirSync(BASE_TMP, { recursive: true });

try {
  const now = Date.now();
  for (const d of readdirSync(BASE_TMP, { withFileTypes: true })) {
    if (!d.isDirectory() || !d.name.startsWith('loc-')) continue;
    const full = join(BASE_TMP, d.name);
    try {
      const st = statSync(full);
      if (now - st.mtimeMs > STALE_TMP_MAX_AGE_MS) {
        rmSync(full, { recursive: true, force: true });
      }
    } catch { /* ignore */ }
  }
} catch { /* ignore */ }

const TMP_DIR = join(BASE_TMP, `loc-${randomUUID()}`);
mkdirSync(TMP_DIR, { recursive: true });
mkdirSync(OUTPUT_ROOT, { recursive: true });

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/* ── Helpers ──────────────────────────────────────────── */
function absolutizeSrc(src) {
  if (!src) return null;
  const base = (MATB3AA_AUDIO_BASE || 'https://www.matb3aa.com').replace(/\/$/, '');

  if (/^https?:\/\//i.test(src)) {
    const filename = src.replace(/^https?:\/\/[^/]+\//i, '');
    const pathOnly = filename.replace(/^(storage\/)?media\//i, '');
    return `${base}/storage/media/${encodeURIComponent(decodeURIComponent(pathOnly))}`;
  }

  const filename = src.replace(/^(storage\/)?media\//i, '').replace(/^\//, '');
  return `${base}/storage/media/${encodeURIComponent(decodeURIComponent(filename))}`;
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
  if (!url) throw new Error('No src for download');

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': `${MATB3AA_AUDIO_BASE.replace(/\/$/, '')}/`,
      'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const buf = Buffer.from(await res.arrayBuffer());

  if (buf.length < 200_000) {
    const preview = buf.slice(0, 200).toString('utf8').replace(/\s+/g, ' ').trim();
    throw new Error(
      `Response too small (${buf.length}b, CT=${contentType}) for ${url}. Preview: ${preview}`
    );
  }
  const b0 = buf[0], b1 = buf[1], b2 = buf[2];
  const isMp3Sync = b0 === 0xFF && (b1 & 0xE0) === 0xE0;
  const isId3Tag  = b0 === 0x49 && b1 === 0x44 && b2 === 0x33;
  const isMp4Box  = b0 === 0x00 && b1 === 0x00 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
  if (!isMp3Sync && !isId3Tag && !isMp4Box) {
    const preview = buf.slice(0, 200).toString('utf8').replace(/\s+/g, ' ').trim();
    throw new Error(
      `Not audio (CT=${contentType}, ${buf.length}b) for ${url}. Preview: ${preview}`
    );
  }

  await pipeline(Readable.from(buf), createWriteStream(destPath));
  return destPath;
}

async function getDuration(path) {
  const { stdout, stderr } = await run(FFPROBE_CMD, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ]);
  const raw = stdout.trim();
  const firstLine = raw.split(/\r?\n/)[0]?.trim() ?? '';
  const dur = parseFloat(firstLine);
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error(
      `Invalid ffprobe duration from ${JSON.stringify(path)}. ` +
      `stdout=${JSON.stringify(raw).slice(0, 300)} ` +
      `stderr=${JSON.stringify(stderr).slice(0, 300)}`
    );
  }
  return dur;
}

/* ── Skip-check ───────────────────────────────────────── */
function checkExisting(outDir, segmentLength, bitrate, sourceDurationSec) {
  const metaPath = join(outDir, 'meta.json');
  if (!existsSync(metaPath)) return { ok: false, reason: 'no-meta' };

  let meta;
  try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); }
  catch { return { ok: false, reason: 'meta-unreadable' }; }

  if (meta.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: 'schema-changed' };
  if (Number(meta.segmentLengthSec) !== Number(segmentLength)) return { ok: false, reason: 'segment-changed' };
  if (String(meta.bitrate) !== String(bitrate)) return { ok: false, reason: 'bitrate-changed' };

  if (sourceDurationSec != null && Number.isFinite(Number(meta.sourceDurationSec))) {
    const diff = Math.abs(Number(meta.sourceDurationSec) - sourceDurationSec);
    if (diff > DURATION_TOLERANCE_SEC) return { ok: false, reason: 'source-changed' };
  }

  const fullPath = join(outDir, meta.fullNvFile ?? 'full-nv.mp3');
  if (!existsSync(fullPath)) return { ok: false, reason: 'full-missing' };

  const parts = Array.isArray(meta.parts) ? meta.parts : [];
  if (parts.length === 0) return { ok: false, reason: 'no-parts' };
  for (const p of parts) {
    if (!p?.file) return { ok: false, reason: 'part-meta-missing' };
    if (!existsSync(join(outDir, p.file))) return { ok: false, reason: 'part-missing' };
  }

  return { ok: true, meta };
}

/* ── Demucs: full-song or chunked ─────────────────────── */
async function demucsFull(sourceFile, trackTmp) {
  const demucsOut = join(trackTmp, 'demucs_full');
  await run(PYTHON_CMD, [
    '-m', 'demucs',
    '--two-stems=vocals',
    '-o', demucsOut,
    sourceFile,
  ]);

  const stemName = sourceFile.replace(/^.*[\\\/]/, '').replace(/\.[^.]+$/, '');
  const noVocals = join(demucsOut, 'htdemucs', stemName, 'no_vocals.wav');
  const vocalsFile = join(demucsOut, 'htdemucs', stemName, 'vocals.wav');

  if (!existsSync(noVocals)) {
    throw new Error(`demucs did not produce no_vocals.wav at ${noVocals}`);
  }
  if (existsSync(vocalsFile)) {
    try { rmSync(vocalsFile); } catch { /* ignore */ }
  }
  return noVocals;
}

async function demucsChunked(sourceFile, duration, segmentLength, trackTmp, index) {
  const n = Math.ceil(duration / segmentLength);
  const chunkNoVocals = [];

  for (let i = 0; i < n; i++) {
    const start = i * segmentLength;
    const len = Math.min(segmentLength, duration - start);
    if (len <= 0) break;

    const rawSlice = join(trackTmp, `chunk_${String(i + 1).padStart(2, '0')}.wav`);
    await run(FFMPEG_CMD, [
      '-y',
      '-ss', start.toFixed(3),
      '-t', len.toFixed(3),
      '-i', sourceFile,
      '-ac', String(DEFAULT_CHANNELS),
      '-ar', String(DEFAULT_SAMPLE_RATE),
      rawSlice,
    ]);

    const demucsOut = join(trackTmp, `demucs_chunk_${i}`);
    await run(PYTHON_CMD, [
      '-m', 'demucs',
      '--two-stems=vocals',
      '-o', demucsOut,
      rawSlice,
    ]);

    const stemName = rawSlice.replace(/^.*[\\\/]/, '').replace(/\.[^.]+$/, '');
    const nv = join(demucsOut, 'htdemucs', stemName, 'no_vocals.wav');
    const voc = join(demucsOut, 'htdemucs', stemName, 'vocals.wav');
    if (!existsSync(nv)) {
      throw new Error(`chunked demucs: missing ${nv}`);
    }
    if (existsSync(voc)) { try { rmSync(voc); } catch { /* ignore */ } }
    chunkNoVocals.push(nv);

    emit({
      stage: 'demucs-chunk',
      index,
      chunk: i + 1,
      totalChunks: n,
    });
  }

  if (chunkNoVocals.length === 0) throw new Error('chunked demucs produced no chunks');

  const concatList = join(trackTmp, 'concat.txt');
  writeFileSync(
    concatList,
    chunkNoVocals.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n',
    'utf8',
  );
  const outWav = join(trackTmp, 'no_vocals.wav');
  await run(FFMPEG_CMD, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatList,
    '-ac', String(DEFAULT_CHANNELS),
    '-ar', String(DEFAULT_SAMPLE_RATE),
    outWav,
  ]);
  return outWav;
}

/* ── Convert WAV → MP3 ────────────────────────────────── */
async function wavToMp3(wavPath, outPath, bitrate) {
  await run(FFMPEG_CMD, [
    '-y',
    '-i', wavPath,
    '-ac', String(DEFAULT_CHANNELS),
    '-ar', String(DEFAULT_SAMPLE_RATE),
    '-codec:a', 'libmp3lame',
    '-b:a', bitrate,
    outPath,
  ]);
}

/* ── Slice WAV into N parts ───────────────────────────── */
async function sliceWav(wavPath, duration, segmentLength, outDir, bitrate, index) {
  const parts = [];
  const total = Math.ceil(duration / segmentLength);

  for (let i = 0; i < total; i++) {
    const startSec = i * segmentLength;
    const endSec = Math.min(startSec + segmentLength, duration);
    const len = endSec - startSec;
    if (len <= 0.05) break;

    const file = `part-${String(i + 1).padStart(2, '0')}-nv.mp3`;
    const outPath = join(outDir, file);

    await run(FFMPEG_CMD, [
      '-y',
      '-ss', startSec.toFixed(3),
      '-t', len.toFixed(3),
      '-i', wavPath,
      '-ac', String(DEFAULT_CHANNELS),
      '-ar', String(DEFAULT_SAMPLE_RATE),
      '-codec:a', 'libmp3lame',
      '-b:a', bitrate,
      outPath,
    ]);

    const durationSec = Number(len.toFixed(3));
    parts.push({
      index: i + 1,
      startSec: Number(startSec.toFixed(3)),
      endSec: Number(endSec.toFixed(3)),
      durationSec,
      file,
    });

    emit({
      stage: 'slice', index,
      part: i + 1, totalParts: total,
      startSec: Number(startSec.toFixed(3)),
      endSec: Number(endSec.toFixed(3)),
      durationSec,
      file,
    });
  }

  return parts;
}

/* ── Per-track processing ─────────────────────────────── */
async function processTrack(track, index, total) {
  const t0 = Date.now();

  // Resolve output paths (artist[/album]/track)
  const { trackDir: outDir } = trackOutputDir(
    track.artistId, track.artistName,
    track.albumName, track.trackName, track.trackId,
  );

  // Skip-check (no duration yet — duration is re-checked after download)
  if (args.skipExisting) {
    const check = checkExisting(outDir, args.segmentLength, args.bitrate, null);
    if (check.ok) {
      emit({
        stage: 'track-skipped',
        done: index + 1, total, index,
        trackName: track.trackName,
        artistName: track.artistName,
        reason: 'already-done',
      });
      return { skipped: true, elapsedMs: Date.now() - t0 };
    }
    if (existsSync(outDir) && check.reason !== 'no-meta') {
      emit({
        stage: 'track-regenerating',
        index,
        trackName: track.trackName,
        artistName: track.artistName,
        reason: check.reason,
      });
      try { rmSync(outDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  } else if (existsSync(outDir)) {
    try { rmSync(outDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  const trackTmp = join(TMP_DIR, `t-${index}-${randomUUID()}`);
  mkdirSync(trackTmp, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const sourceFile = join(trackTmp, 'source.mp3');

  emit({
    stage: 'track-start',
    index, total,
    trackName: track.trackName,
    artistName: track.artistName,
    albumName: track.albumName ?? null,
  });

  // 1. Download
  await download(track.src, sourceFile);
  let bytes = 0;
  try { bytes = statSync(sourceFile).size; } catch { /* ignore */ }
  emit({ stage: 'download', index, bytes, trackName: track.trackName });

  // 2. Duration — throws with raw ffprobe output on failure
  const duration = await getDuration(sourceFile);

  // 3. Decide demucs mode
  const useChunked = duration > args.maxDemucsSec;
  const demucsT0 = Date.now();
  emit({
    stage: 'demucs-start',
    index,
    mode: useChunked ? 'chunked' : 'full',
    durationSec: Number(duration.toFixed(2)),
    maxDemucsSec: args.maxDemucsSec,
    totalChunks: useChunked ? Math.ceil(duration / args.segmentLength) : undefined,
  });

  const noVocalsWav = useChunked
    ? await demucsChunked(sourceFile, duration, args.segmentLength, trackTmp, index)
    : await demucsFull(sourceFile, trackTmp);

  emit({ stage: 'demucs-done', index, elapsedMs: Date.now() - demucsT0 });

  // 4. Full no-vocals MP3
  const fullNvFile = 'full-nv.mp3';
  const fullNvPath = join(outDir, fullNvFile);
  await wavToMp3(noVocalsWav, fullNvPath, args.bitrate);
  emit({
    stage: 'full-nv',
    index,
    file: fullNvFile,
    durationSec: Number(duration.toFixed(3)),
  });

  // 5. Slice
  const parts = await sliceWav(
    noVocalsWav, duration, args.segmentLength, outDir, args.bitrate, index,
  );

  // 6. meta.json
  const relativePath = relative(OUTPUT_ROOT, outDir).split(sep).join('/');
  const meta = {
    schemaVersion: SCHEMA_VERSION,
    artistId: track.artistId,
    artistName: track.artistName,
    trackId: track.trackId,
    trackName: track.trackName,
    albumName: track.albumName ?? null,
    albumSlug: track.albumName ? slugify(track.albumName) : null,
    relativePath,
    sourceUrl: absolutizeSrc(track.src),
    sourceDurationSec: Number(duration.toFixed(3)),
    segmentLengthSec: args.segmentLength,
    bitrate: args.bitrate,
    channels: DEFAULT_CHANNELS,
    sampleRate: DEFAULT_SAMPLE_RATE,
    pipeline: 'separate-full-then-slice',
    demucsMode: useChunked ? 'chunked' : 'full',
    fullNvFile,
    parts,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  try { rmSync(trackTmp, { recursive: true, force: true }); } catch { /* ignore */ }

  return { skipped: false, segments: parts, elapsedMs: Date.now() - t0 };
}

/* ── Main loop ────────────────────────────────────────── */
(async () => {
  const t0 = Date.now();
  const total = tracks.length;

  emit({ stage: 'start', done: 0, total });

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const track = tracks[i];
    try {
      const r = await processTrack(track, i, total);
      if (r.skipped) skipped += 1;
      else succeeded += 1;
      emit({
        stage: 'track-done',
        done: i + 1,
        total,
        summary: { total, succeeded, skipped, failed },
      });
    } catch (e) {
      failed += 1;
      emit({
        stage: 'track-failed',
        done: i + 1,
        total,
        summary: { total, succeeded, skipped, failed },
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
    skipped,
    failed,
    segmentLengthSec: args.segmentLength,
    bitrate: args.bitrate,
    maxDemucsSec: args.maxDemucsSec,
    schemaVersion: SCHEMA_VERSION,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  emit({
    stage: 'done',
    done: total,
    total,
    status: 'done',
    summary: { total, succeeded, skipped, failed },
    manifestPath,
  });

  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(failed > 0 && succeeded === 0 && skipped === 0 ? 1 : 0);
})();