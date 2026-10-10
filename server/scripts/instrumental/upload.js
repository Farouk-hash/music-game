// server/scripts/instrumental/upload.js
//
// Read local instrumental segments, upload to R2, insert into D1,
// then delete the local files. Emits JSON progress lines.
//
// Usage:
//   node upload.js --tracks-file=<path> [--remove-local=1]
//
// The tracks file is a JSON array:
//   [
//     {
//       artistId, artistName, trackId, trackName, albumName,
//       segments: [
//         { seg: 'middle', file: 'seg_middle.mp3', absolutePath: 'E:\\…' },
//         { seg: 'custom', file: 'seg_custom.mp3', absolutePath: 'E:\\…' },
//       ]
//     },
//     …
//   ]

import {
  existsSync, readFileSync, rmSync, statSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

/* ── Args ──────────────────────────────────────────────── */
function parseArgs(argv) {
  const out = { tracksFile: null, removeLocal: true };
  for (const a of argv) {
    if (a.startsWith('--tracks-file='))   out.tracksFile   = a.slice('--tracks-file='.length);
    if (a.startsWith('--remove-local='))  out.removeLocal  = a.slice('--remove-local='.length) !== '0';
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

/* ── Config ────────────────────────────────────────────── */
const CF_BASE = process.env.CF_API_BASE
  ?? 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';
const INSTRUMENT_GENRE_ID = 6;

/* ── Emit helpers ──────────────────────────────────────── */
function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/* ── HTTP helpers ──────────────────────────────────────── */
async function uploadClipToR2(r2Key, absolutePath) {
  const buf = readFileSync(absolutePath);
  const url = `${CF_BASE}/instrumentals/upload?key=${encodeURIComponent(r2Key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: buf,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`R2 upload failed (${res.status}) at ${url}: ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function postBulk(items) {
  const res = await fetch(`${CF_BASE}/instruments/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`bulk insert failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

/* ── Slug helper ───────────────────────────────────────── */
function slugify(str) {
  return String(str ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    || 'unnamed';
}

/* ── Per-track processing ──────────────────────────────── */
async function processTrack(track, index, total) {
  const artistSlug = slugify(track.artistName);
  const trackSlug  = slugify(track.trackName);

  const results = {
    artistId: track.artistId,
    trackName: track.trackName,
    uploaded: [],
    errors: [],
  };

  for (const seg of track.segments) {
    const r2Key = `instrumentals/${artistSlug}/${trackSlug}/${seg.seg}.mp3`;

    // 1. Upload to R2
    try {
      await uploadClipToR2(r2Key, seg.absolutePath);
    } catch (e) {
      results.errors.push({ seg: seg.seg, stage: 'r2', error: e.message });
      continue;
    }

    emit({ stage: 'r2-uploaded', index, seg: seg.seg, r2Key });

    // 2. Build the D1 row
    const baseGenres = Array.isArray(track.genreIds) ? track.genreIds : [];
    const mergedGenres = [...new Set([INSTRUMENT_GENRE_ID, ...baseGenres])];

    const item = {
      artist_id:  track.artistId,
      track_name: track.trackName,
      position:   seg.seg,
      r2_key:     r2Key,
      album_name: track.albumName ?? null,
      genre_ids:  mergedGenres
    };
    results.uploaded.push(item);
  }

  // 3. Bulk insert all segments for this track
  if (results.uploaded.length > 0) {
    try {
      await postBulk(results.uploaded);
      emit({ stage: 'db-inserted', index, count: results.uploaded.length });
    } catch (e) {
      results.errors.push({ stage: 'db', error: e.message });
    }
  }

  return results;
}

/* ── Main ──────────────────────────────────────────────── */
(async () => {
  const t0 = Date.now();
  const total = tracks.length;

  emit({ stage: 'start', done: 0, total });

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const track = tracks[i];
    emit({
      stage: 'track-start',
      index: i, total,
      trackName: track.trackName,
      artistName: track.artistName,
    });

    try {
      const result = await processTrack(track, i, total);

      if (result.errors.length > 0) {
        failed += 1;
        emit({
          stage: 'track-failed',
          done: i + 1,
          total,
          summary: { total, succeeded, failed },
          error: result.errors.map(e => `${e.seg ?? e.stage}: ${e.error}`).join('; '),
        });
        continue;
      }

      // Success — optionally remove local files
      if (args.removeLocal) {
        for (const seg of track.segments) {
          try { rmSync(seg.absolutePath, { force: true }); }
          catch (e) { console.warn('local delete failed:', seg.absolutePath, e.message); }
        }
      }

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

  emit({
    stage: 'done',
    done: total,
    total,
    status: 'done',
    summary: { total, succeeded, failed },
    elapsedMs: Date.now() - t0,
  });

  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
})();