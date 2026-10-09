// server/lib/publish-clip.js
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import ffmpegPath from 'ffmpeg-static';
import 'dotenv/config';
import { promisify } from 'node:util';
import ffprobeStatic from 'ffprobe-static';

const MATB3AA_BASE = process.env.MATB3AA_BASE;
const CF_BASE = process.env.CF_API_BASE;

if (!MATB3AA_BASE) throw new Error('MATB3AA_BASE is not set in .env');
if (!CF_BASE)     throw new Error('CF_API_BASE is not set in .env');

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = join(__dirname, '..', 'tmp-preview-test');

const execFileAsync = promisify(execFile);
const FFPROBE_PATH = ffprobeStatic.path;

/**
 * Probe the duration of an audio file in seconds using ffprobe.
 * Returns 0 if the probe fails — callers must handle that.
 */
async function probeDuration(filePath) {
  try {
    const { stdout } = await execFileAsync(FFPROBE_PATH, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const sec = parseFloat(stdout.trim());
    return Number.isFinite(sec) && sec > 0 ? sec : 0;
  } catch (e) {
    console.warn('[probeDuration] failed:', e.message);
    return 0;
  }
}

/**
 * Compute the actual startSec given the true duration.
 */
function resolveStartSec(position, incomingStartSec, seconds, trueDurationSec) {
  if (position === 'custom') {
    return Math.max(0, Math.floor(incomingStartSec));
  }
  if (position === 'start' || trueDurationSec === 0) {
    return 0;
  }
  if (position === 'middle') {
    return Math.max(0, Math.floor((trueDurationSec - seconds) / 2));
  }
  if (position === 'end') {
    return Math.max(0, Math.floor(trueDurationSec - seconds));
  }
  return 0;
}

/**
 * Produce one rendition (forward or reversed) of a clip and upload it to R2.
 *
 * This function does NOT write to D1. The caller is responsible for saving
 * the slot row with both r2_key and r2_reversed_key as appropriate.
 *
 * @param {Object} opts
 * @param {string|number} opts.trackId     unique ID for the clip's R2 namespace
 * @param {string} opts.sourceSrc          relative path (matb3aa), absolute URL (mp3quran),
 *                                         or local absolute path (upload)
 * @param {string} opts.name               display name (used for logging only)
 * @param {number} opts.artistId           artist/reciter ID (used for logging only)
 * @param {string} [opts.position]         start | middle | end | custom
 * @param {number} [opts.startSec]         where to start cutting (default 0)
 * @param {number} [opts.seconds]          clip length in seconds (default 10)
 * @param {string} [opts.label]            unused here; caller persists it
 * @param {string} [opts.source]           'music' (default) | 'quran' | 'upload'
 * @param {boolean} [opts.reversed]        true = reverse the trimmed clip
 * @param {Function} [opts.onProgress]     callback(stage, data)
 */
export async function publishClip({
  trackId,
  sourceSrc,
  name,
  artistId,
  position = 'start',
  startSec = 0,
  seconds = 10,
  label = null,
  source = 'music',
  reversed = false,
  onProgress = () => {},
}) {
  if (!trackId)     throw new Error('trackId is required');
  if (!sourceSrc)   throw new Error('sourceSrc is required');
  if (!name)        throw new Error('name is required');
  if (!artistId)    throw new Error('artistId is required');

  // ── Resolve source ───────────────────────────────────
  const isLocalPath =
    !sourceSrc.startsWith('http') &&
    (sourceSrc.startsWith('/') || /^[A-Za-z]:[\\/]/.test(sourceSrc));

  const sourceUrl = isLocalPath
    ? sourceSrc
    : (sourceSrc.startsWith('http')
        ? sourceSrc
        : `${MATB3AA_BASE}/${encodeURI(sourceSrc)}`);

  fs.mkdirSync(TMP_DIR, { recursive: true });

  const token = Math.random().toString(36).slice(2, 8);
  const tmpInput = join(TMP_DIR, `source-${trackId}-${token}.mp3`);
  const tmpClip  = join(TMP_DIR, `clip-${trackId}-${position}-${reversed ? 'rev-' : ''}${token}.mp3`);

  let stage = 'download';
  const startedAt = Date.now();
  const timings = {};

  try {
    // ── Acquire input file (download OR copy from disk) ──
    if (isLocalPath) {
      onProgress('download:skip', { reason: 'local file', path: sourceSrc });
      await fsp.copyFile(sourceSrc, tmpInput);
      timings.download = 0;
    } else {
      onProgress('download:start', { sourceUrl });
      const t0 = Date.now();
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      await fsp.writeFile(tmpInput, Buffer.from(await res.arrayBuffer()));
      timings.download = Date.now() - t0;
      onProgress('download:done', { ms: timings.download });
    }

    // ── Probe duration ──────────────────────────────────
    stage = 'probe';
    onProgress('probe:start');
    const tProbe = Date.now();
    const trueDuration = await probeDuration(tmpInput);
    timings.probe = Date.now() - tProbe;
    onProgress('probe:done', { ms: timings.probe, durationSec: trueDuration });

    // ── Compute the effective startSec ──────────────────
    const effectiveStartSec = resolveStartSec(
      position,
      Number.isFinite(startSec) ? startSec : 0,
      seconds,
      trueDuration
    );

    // ── Extract (forward or reversed) ───────────────────
    stage = 'ffmpeg';
    onProgress('ffmpeg:start', {
      startSec: effectiveStartSec,
      seconds,
      position,
      trueDuration,
      reversed,
    });
    const t1 = Date.now();
    await runFfmpeg(tmpInput, tmpClip, effectiveStartSec, seconds, reversed);
    timings.ffmpeg = Date.now() - t1;
    const clipBuffer = await fsp.readFile(tmpClip);
    onProgress('ffmpeg:done', { ms: timings.ffmpeg, sizeBytes: clipBuffer.length });

    // ── Upload to R2 ────────────────────────────────────
    stage = 'upload';
    onProgress('upload:start', { sizeBytes: clipBuffer.length });
    const t2 = Date.now();
    const uploadRes = await fetch(
      `${CF_BASE}/clips/${encodeURIComponent(trackId)}` +
      `?position=${position}` +
      `&duration=${seconds * 1000}` +
      `&start=${effectiveStartSec}` +
      `&source=${source}` +
      `&reversed=${reversed ? '1' : '0'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: clipBuffer,
      }
    );
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${err.slice(0, 200)}`);
    }
    const uploadData = await uploadRes.json();
    timings.upload = Date.now() - t2;
    onProgress('upload:done', { ms: timings.upload, r2_key: uploadData.r2_key });

    // ── Return R2 metadata. Caller is responsible for D1 save. ──
    return {
      r2_key: uploadData.r2_key,
      size_bytes: uploadData.size_bytes,
      position: uploadData.position,
      duration_ms: uploadData.duration_ms,
      reversed: !!reversed,
      start_sec: effectiveStartSec,
      true_duration_sec: trueDuration,
      serveUrl: `${CF_BASE}/clips/serve?key=${encodeURIComponent(uploadData.r2_key)}`,
      timings,
      elapsed: Date.now() - startedAt,
    };
  } catch (e) {
    throw new Error(`[publishClip:${stage}] ${e.message}`);
  } finally {
    await fsp.unlink(tmpInput).catch(() => {});
    await fsp.unlink(tmpClip).catch(() => {});
  }
}


/**
 * Take an existing forward clip (already in R2), reverse its audio,
 * upload the reversed version back to R2, and return the new key.
 *
 * @param {Object} opts
 * @param {string|number} opts.trackId        R2 namespace (used in the key)
 * @param {string}  opts.forwardKey           R2 key of the forward clip, e.g. "clips/upload/track-123-start-10s.mp3"
 * @param {string}  opts.position             'start' | 'middle' | 'end' | 'custom'
 * @param {number}  opts.durationSec          duration of the clip in seconds
 * @param {number}  opts.startSec             original cut offset (for custom position, optional)
 * @param {string}  [opts.source]             'music' | 'quran' | 'upload'
 * @param {Function}[opts.onProgress]
 * @returns {Promise<{r2_key, size_bytes, reversed: true, serveUrl}>}
 */
export async function reverseExistingClip({
  trackId,
  forwardKey,
  position = 'start',
  durationSec = 10,
  startSec = 0,
  source = 'music',
  onProgress = () => {},
}) {
  if (!trackId)    throw new Error('trackId is required');
  if (!forwardKey) throw new Error('forwardKey is required');

  fs.mkdirSync(TMP_DIR, { recursive: true });
  const token = Math.random().toString(36).slice(2, 8);
  const tmpIn  = join(TMP_DIR, `rev-in-${trackId}-${token}.mp3`);
  const tmpOut = join(TMP_DIR, `rev-out-${trackId}-${token}.mp3`);

  let stage = 'download';
  const startedAt = Date.now();
  const timings = {};

  try {
    // ── Download the forward clip from R2 ────────────────
    stage = 'download';
    onProgress('download:start', { forwardKey });
    const t0 = Date.now();
    const downloadUrl =
      `${CF_BASE}/clips/serve?key=${encodeURIComponent(forwardKey)}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fsp.writeFile(tmpIn, buf);
    timings.download = Date.now() - t0;
    onProgress('download:done', { ms: timings.download, sizeBytes: buf.length });

    // ── Reverse via FFmpeg ───────────────────────────────
    stage = 'ffmpeg';
    onProgress('ffmpeg:start');
    const t1 = Date.now();
    await runFfmpegReverseWhole(tmpIn, tmpOut);
    timings.ffmpeg = Date.now() - t1;
    const reversedBuf = await fsp.readFile(tmpOut);
    onProgress('ffmpeg:done', { ms: timings.ffmpeg, sizeBytes: reversedBuf.length });

    // ── Upload the reversed clip to R2 ───────────────────
    stage = 'upload';
    onProgress('upload:start', { sizeBytes: reversedBuf.length });
    const t2 = Date.now();
    const uploadRes = await fetch(
      `${CF_BASE}/clips/${encodeURIComponent(trackId)}` +
      `?position=${position}` +
      `&duration=${durationSec * 1000}` +
      `&start=${startSec}` +
      `&source=${source}` +
      `&reversed=1`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: reversedBuf,
      }
    );
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${err.slice(0, 200)}`);
    }
    const uploadData = await uploadRes.json();
    timings.upload = Date.now() - t2;
    onProgress('upload:done', { ms: timings.upload, r2_key: uploadData.r2_key });

    return {
      r2_key: uploadData.r2_key,
      size_bytes: uploadData.size_bytes,
      reversed: true,
      serveUrl: `${CF_BASE}/clips/serve?key=${encodeURIComponent(uploadData.r2_key)}`,
      timings,
      elapsed: Date.now() - startedAt,
    };
  } catch (e) {
    throw new Error(`[reverseExistingClip:${stage}] ${e.message}`);
  } finally {
    await fsp.unlink(tmpIn).catch(() => {});
    await fsp.unlink(tmpOut).catch(() => {});
  }
}

/**
 * Reverse the ENTIRE input file. No trim, no atrim — the input is
 * already a clip. Re-encodes with the same lame settings used for clips.
 */
function runFfmpegReverseWhole(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-af', 'areverse',
      '-acodec', 'libmp3lame',
      '-ab', '24k',
      '-ac', '1',
      '-ar', '22050',
      '-compression_level', '9',
      '-y',
      outputPath,
    ];

    const proc = spawn(ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}\n${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

function runFfmpeg(inputPath, outputPath, startSec, seconds, reversed = false) {
  const s = Number.isFinite(startSec) && startSec >= 0 ? Math.floor(startSec) : 0;
  const d = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 10;

  return new Promise((resolve, reject) => {
    const args = [
      '-ss', String(s),
      '-i', inputPath,
    ];

    if (reversed) {
      // Trim inside the filter graph, then reverse the trimmed buffer.
      // Using atrim instead of -t so areverse sees exactly `d` seconds.
      args.push('-af', `atrim=duration=${d},areverse`);
    } else {
      args.push('-t', String(d));
    }

    args.push(
      '-acodec', 'libmp3lame',
      '-ab', '24k',
      '-ac', '1',
      '-ar', '22050',
      '-compression_level', '9',
      '-y',
      outputPath,
    );

    const proc = spawn(ffmpegPath, args);
    let stderr = '';
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}\n${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}