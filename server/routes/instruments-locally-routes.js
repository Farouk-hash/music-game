// server/routes/instruments-locally-routes.js
//
// Express routes for the "instruments-locally" pipeline — the parallel
// pipeline to /api/instrumental that produces full-nv + 30s-nv MP3s and
// keeps them on disk (E:\Instruments-locally by default). Never uploads.
//
// Endpoints:
//   POST /api/instruments-locally/batch   body { tracks[] | artists[] }
//   GET  /api/instruments-locally/status?artist_ids=1,2,3

import { Router } from 'express';
import { spawn } from 'node:child_process';
import {
  existsSync, writeFileSync, mkdirSync, readdirSync, readFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { matb3aa } from '../matb3aa.js';

import {
  createJob, getJob, attachChild,
  updateFromLine, appendLog, finishJob, publicJob,
} from '../lib/job-registry.js';

const router = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_SCRIPT = join(__dirname, '..', 'scripts', 'instruments-locally', 'batch.js');
const OUTPUT_ROOT  = process.env.SPLIT_OUTPUT_ROOT
  ? resolve(process.env.SPLIT_OUTPUT_ROOT)
  : resolve('E:\\Instruments-locally');
const TMP_DIR      = join(__dirname, '..', 'tmp-preview-test');

const SCHEMA_VERSION = 1;
const MATB3AA_AUDIO_BASE =
  process.env.MATB3AA_BASE ?? 'https://www.matb3aa.com';

/* ═══════════════════════════════════════════════════════════
   Log formatter
   ═══════════════════════════════════════════════════════════ */
function formatLocallyEvent(e) {
  switch (e.stage) {
    case 'start':
      return `▶ Start — ${e.total} track${e.total === 1 ? '' : 's'}`;
    case 'track-start': {
      const album = e.albumName ? `  [${e.albumName}]` : '';
      return `  [${e.index + 1}/${e.total}] ${e.trackName}${album} — ${e.artistName}`;
    }
    case 'track-skipped':
      return `  ⟳ skipped [${e.done}/${e.total}] ${e.trackName} (${e.reason})`;
    case 'track-regenerating':
      return `  ↻ regenerating ${e.trackName} (${e.reason})`;
    case 'download':
      return `     ↓ downloaded ${e.bytes ? (e.bytes / 1024 / 1024).toFixed(2) + ' MB' : ''}`;
    case 'demucs-start':
      return e.mode === 'chunked'
        ? `     ♪ removing vocals (chunked, ${e.totalChunks} chunks, ${e.durationSec}s / max ${e.maxDemucsSec}s)…`
        : `     ♪ removing vocals (full song, ${e.durationSec}s / max ${e.maxDemucsSec}s)…`;
    case 'demucs-chunk':
      return `     ♪ chunk ${e.chunk}/${e.totalChunks}`;
    case 'demucs-done':
      return `     ✓ vocals removed in ${(e.elapsedMs / 1000).toFixed(1)}s`;
    case 'full-nv':
      return `     → ${e.file} (${e.durationSec.toFixed(1)}s)`;
    case 'slice':
      return `     ✂ part ${e.part}/${e.totalParts}  ${e.startSec.toFixed(1)}–${e.endSec.toFixed(1)}s  → ${e.file}`;
    case 'track-done':
      return `  ✓ done [${e.done}/${e.total}] · ok=${e.summary?.succeeded ?? '?'} skipped=${e.summary?.skipped ?? '?'} failed=${e.summary?.failed ?? '?'}`;
    case 'track-failed':
      return `  ✗ failed — ${e.error}`;
    case 'done':
      return `■ Complete — ${e.summary?.succeeded ?? '?'} ok, ${e.summary?.skipped ?? '?'} skipped, ${e.summary?.failed ?? '?'} failed`;
    default:
      return JSON.stringify(e);
  }
}

/* ═══════════════════════════════════════════════════════════
   Spawn + track job (mirrors instrumental-routes.js)
   ═══════════════════════════════════════════════════════════ */
function spawnAndTrackJob({ scriptPath, args, scope, jobArgs, formatter }) {
  const job = createJob({ scope, args: jobArgs });

  if (!existsSync(scriptPath)) {
    finishJob(job.id, { status: 'failed', error: `Script not found: ${scriptPath}` });
    return { job, child: null, error: `Script not found: ${scriptPath}` };
  }

  let child;
  try {
    child = spawn(process.execPath, [scriptPath, ...args], {
      env: process.env,
      cwd: resolve(__dirname, '..', '..'),
    });
  } catch (e) {
    finishJob(job.id, { status: 'failed', error: `spawn failed: ${e.message}` });
    return { job, child: null, error: e.message };
  }

  attachChild(job.id, child);

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const payload = JSON.parse(trimmed);
        updateFromLine(job.id, payload);
        appendLog(job.id, formatter(payload));
        return;
      } catch { /* fallthrough */ }
    }
    appendLog(job.id, trimmed);
  });

  const rlErr = readline.createInterface({ input: child.stderr });
  rlErr.on('line', (line) => {
    if (line.trim()) appendLog(job.id, `[stderr] ${line}`);
  });

  child.on('exit', (code, signal) => {
    const current = getJob(job.id);
    if (!current) return;
    if (current.status === 'cancelled' || current.status === 'done' || current.status === 'failed') return;
    if (code === 0) finishJob(job.id, { status: 'done' });
    else if (signal) finishJob(job.id, { status: 'cancelled', error: `killed by ${signal}` });
    else finishJob(job.id, { status: 'failed', error: `exit code ${code}` });
  });

  child.on('error', (e) => finishJob(job.id, { status: 'failed', error: e.message }));

  return { job, child, error: null };
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */
function absolutizeSrc(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${MATB3AA_AUDIO_BASE.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
}

async function fetchArtistCatalogue(slug) {
  const profile = await matb3aa.api(`/artists/${encodeURIComponent(slug)}`);
  if (!profile?.artist?.id) {
    throw new Error(`Artist "${slug}" not found`);
  }
  const artistId = profile.artist.id;
  const artist = {
    id: artistId,
    name: profile.artist.name,
    wp_slug: profile.artist.wp_slug,
  };

  const allTracks = [];
  for (let page = 1; page <= 20; page++) {
    const j = await matb3aa.api(`/artists/${artistId}/tracks?perPage=100&page=${page}`);
    const items = j.pagination?.data || [];
    if (!items.length) break;
    allTracks.push(...items);
    if (!j.pagination?.next_page) break;
  }

  const allAlbums = [];
  for (let page = 1; page <= 10; page++) {
    const j = await matb3aa.api(`/artists/${artistId}/albums?perPage=100&page=${page}`);
    const items = j.pagination?.data || [];
    if (!items.length) break;
    allAlbums.push(...items);
    if (!j.pagination?.next_page) break;
  }

  const trackMap = new Map();
  for (const t of allTracks) {
    trackMap.set(t.id, {
      id: t.id, name: t.name, src: absolutizeSrc(t.src),
      duration: t.duration, album_id: null, album_name: null,
    });
  }
  for (const album of allAlbums) {
    try {
      const data = await matb3aa.api(`/albums/${album.id}`);
      const albumTracks = data?.album?.tracks ?? [];
      for (const t of albumTracks) {
        if (trackMap.has(t.id)) {
          const entry = trackMap.get(t.id);
          entry.album_id = album.id;
          entry.album_name = album.name;
        } else {
          trackMap.set(t.id, {
            id: t.id, name: t.name, src: absolutizeSrc(t.src),
            duration: t.duration, album_id: album.id, album_name: album.name,
          });
        }
      }
    } catch (e) {
      console.warn(`[instruments-locally] album ${album.id} failed:`, e.message);
    }
  }

  return { artist, tracks: [...trackMap.values()] };
}

/* ═══════════════════════════════════════════════════════════
   POST /api/instruments-locally/batch
   ═══════════════════════════════════════════════════════════ */
router.post('/instruments-locally/batch', async (req, res) => {
  const segmentLengthSec = Number(req.body?.segmentLengthSec) || 30;
  const bitrate = String(req.body?.bitrate ?? '192k');
  const skipExisting = req.body?.skipExisting !== false;
  const maxDemucsSec = Number(req.body?.maxDemucsSec) || 600;

  const tracksIn  = Array.isArray(req.body?.tracks)  ? req.body.tracks  : null;
  const artistsIn = Array.isArray(req.body?.artists) ? req.body.artists : null;

  const allTracks = [];
  const failures = [];

  if (tracksIn && tracksIn.length > 0) {
    for (const t of tracksIn) {
      if (!t?.src || !t?.trackName) {
        failures.push({ track: t?.trackName ?? '(unknown)', error: 'missing src or trackName' });
        continue;
      }
      allTracks.push({
        artistId:   Number(t.artistId) || null,
        artistName: String(t.artistName ?? 'unknown'),
        trackId:    Number(t.trackId)  || null,
        trackName:  String(t.trackName),
        albumName:  t.albumName ?? null,
        src:        absolutizeSrc(t.src),
        duration:   t.duration ?? null,
      });
    }
  } else if (artistsIn && artistsIn.length > 0) {
    for (const artist of artistsIn) {
      if (!artist?.slug && !artist?.wp_slug) {
        failures.push({ artist, error: 'missing slug' });
        continue;
      }
      const slug = artist.slug ?? artist.wp_slug;
      try {
        const { artist: a, tracks } = await fetchArtistCatalogue(slug);
        for (const t of tracks) {
          if (!t.src) continue;
          allTracks.push({
            artistId: a.id,
            artistName: a.name,
            trackId: t.id,
            trackName: t.name,
            albumName: t.album_name ?? null,
            src: absolutizeSrc(t.src),
            duration: t.duration ?? null,
          });
        }
      } catch (e) {
        failures.push({ artist, error: e.message });
      }
    }
  } else {
    return res.status(400).json({ error: 'Provide either tracks[] or artists[]' });
  }

  if (allTracks.length === 0) {
    return res.status(200).json({
      ok: false, count: 0,
      message: 'No tracks with a source URL found.',
      failures,
    });
  }

  try { mkdirSync(TMP_DIR, { recursive: true }); } catch { /* exists */ }
  const tracksFile = join(TMP_DIR, `loc-${randomUUID()}.json`);
  writeFileSync(tracksFile, JSON.stringify(allTracks), 'utf8');

  const cliArgs = [
    `--tracks-file=${tracksFile}`,
    `--segment-length=${segmentLengthSec}`,
    `--bitrate=${bitrate}`,
    `--max-demucs-sec=${maxDemucsSec}`,
    `--skip-existing=${skipExisting ? 1 : 0}`,
  ];

  const { job, error } = spawnAndTrackJob({
    scriptPath: BATCH_SCRIPT,
    args: cliArgs,
    scope: 'instruments-locally-batch',
    jobArgs: {
      total: allTracks.length,
      artists: new Set(allTracks.map(t => t.artistId).filter(Boolean)).size,
      segmentLengthSec,
      bitrate,
      skipExisting,
      maxDemucsSec,
    },
    formatter: formatLocallyEvent,
  });

  if (error) {
    return res.status(500).json({ error, job: publicJob(job) });
  }

  return res.status(201).json({
    job: publicJob(job),
    count: allTracks.length,
    failures,
  });
});

/* ═══════════════════════════════════════════════════════════
   GET /api/instruments-locally/status?artist_ids=1,2,3

   Walks the mixed-depth layout:
     <ROOT>/<id>_<slug>/<track>/meta.json         (no album)
     <ROOT>/<id>_<slug>/<album>/<track>/meta.json (with album)

   Distinguisher: presence of meta.json → it's a track dir.
   ═══════════════════════════════════════════════════════════ */
router.get('/instruments-locally/status', async (req, res) => {
  const idsParam = String(req.query.artist_ids ?? '').trim();
  const wantedIds = idsParam
    ? new Set(idsParam.split(',').map(s => Number(s.trim())).filter(Number.isInteger))
    : null;

  let artistDirs;
  try {
    artistDirs = readdirSync(OUTPUT_ROOT, { withFileTypes: true }).filter(d => d.isDirectory());
  } catch {
    return res.json({ tracks: [] });
  }

  const tracks = [];

  function collectTrack(trackDir, artistIdFromPath) {
    const metaPath = join(trackDir, 'meta.json');
    if (!existsSync(metaPath)) return;
    let meta;
    try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); }
    catch { return; }

    const fullNvFile = meta.fullNvFile ?? 'full-nv.mp3';
    const fullNvPath = join(trackDir, fullNvFile);
    const hasFullNv = existsSync(fullNvPath);

    const listedParts = Array.isArray(meta.parts) ? meta.parts : [];
    const parts = [];
    for (const p of listedParts) {
      if (!p?.file) continue;
      const filePath = join(trackDir, p.file);
      parts.push({
        index: p.index,
        startSec: p.startSec,
        endSec: p.endSec,
        durationSec: p.durationSec,
        file: p.file,
        absolutePath: filePath,
        exists: existsSync(filePath),
      });
    }

    const allPartsPresent = parts.length > 0 && parts.every(p => p.exists);
    const schemaOk = meta.schemaVersion === SCHEMA_VERSION;

    let state;
    if (!schemaOk) state = 'stale';
    else if (hasFullNv && allPartsPresent) state = 'ready';
    else state = 'stale';

    tracks.push({
      artistId: meta.artistId ?? artistIdFromPath,
      artistName: meta.artistName ?? null,
      trackId: meta.trackId ?? null,
      trackName: meta.trackName ?? trackDir.split(/[\\/]/).pop(),
      albumName: meta.albumName ?? null,
      sourceUrl: meta.sourceUrl ?? null,
      sourceDurationSec: meta.sourceDurationSec ?? null,
      segmentLengthSec: meta.segmentLengthSec ?? null,
      bitrate: meta.bitrate ?? null,
      pipeline: meta.pipeline ?? null,
      demucsMode: meta.demucsMode ?? null,
      hasFullNv,
      fullNvFile,
      parts,
      partsCount: parts.length,
      schemaVersion: meta.schemaVersion ?? null,
      state,
      generatedAt: meta.generatedAt ?? null,
      dir: trackDir,
    });
  }

  for (const ad of artistDirs) {
    const m = ad.name.match(/^(\d+)_/);
    if (!m) continue;
    const artistId = Number(m[1]);
    if (wantedIds && !wantedIds.has(artistId)) continue;

    const artistDir = join(OUTPUT_ROOT, ad.name);
    let children;
    try {
      children = readdirSync(artistDir, { withFileTypes: true }).filter(d => d.isDirectory());
    } catch { continue; }

    for (const child of children) {
      const childDir = join(artistDir, child.name);
      if (existsSync(join(childDir, 'meta.json'))) {
        collectTrack(childDir, artistId);
      } else {
        let grandChildren;
        try {
          grandChildren = readdirSync(childDir, { withFileTypes: true }).filter(d => d.isDirectory());
        } catch { continue; }
        for (const g of grandChildren) {
          collectTrack(join(childDir, g.name), artistId);
        }
      }
    }
  }

  return res.json({ tracks });
});

export default router;