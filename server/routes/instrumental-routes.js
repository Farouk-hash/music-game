// server/routes/instrumental-routes.js
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
const BATCH_SCRIPT  = join(__dirname, '..', 'scripts', 'instrumental', 'batch.js');
const UPLOAD_SCRIPT = join(__dirname, '..', 'scripts', 'instrumental', 'upload.js');
const OUTPUT_ROOT   = join(__dirname, '..', 'instrumental-output');
const TMP_DIR       = join(__dirname, '..', 'tmp-preview-test');

const MATB3AA_AUDIO_BASE =
  process.env.MATB3AA_BASE ?? 'https://www.matb3aa.com';

/* ═══════════════════════════════════════════════════════════
   Log formatters
   ═══════════════════════════════════════════════════════════ */
function formatBatchEvent(e) {
  switch (e.stage) {
    case 'start':         return `▶ Start — ${e.total} track${e.total === 1 ? '' : 's'}`;
    case 'track-start':   return `  [${e.index + 1}/${e.total}] ${e.trackName} — ${e.artistName}`;
    case 'download':      return `     ↓ downloaded ${e.bytes ? (e.bytes / 1024 / 1024).toFixed(2) + ' MB' : ''}`;
    case 'cut':           return `     ✂ ${e.phase} cut: ${e.seg} @ ${e.start?.toFixed(1)}s`;
    case 'demucs-start':  return `     ♪ removing vocals (${e.seg})…`;
    case 'demucs-done':   return `     ✓ vocals removed (${e.seg}) in ${(e.elapsedMs / 1000).toFixed(1)}s`;
    case 'track-done':    return `  ✓ done [${e.done}/${e.total}] — ${e.summary?.succeeded} ok, ${e.summary?.failed} failed`;
    case 'track-failed':  return `  ✗ failed — ${e.error}`;
    case 'done':          return `■ Complete — ${e.summary?.succeeded} ok, ${e.summary?.failed} failed`;
    default:              return JSON.stringify(e);
  }
}

function formatUploadEvent(e) {
  switch (e.stage) {
    case 'start':         return `▶ Upload start — ${e.total} track${e.total === 1 ? '' : 's'}`;
    case 'track-start':   return `\n[${(e.index ?? 0) + 1}/${e.total}] ${e.trackName} — ${e.artistName}`;
    case 'r2-uploaded':   return `   ↑ R2: ${e.seg} → ${e.r2Key}`;
    case 'db-inserted':   return `   ✓ D1 insert: ${e.count} row${e.count === 1 ? '' : 's'}`;
    case 'track-done':    return `   ✓ done [${e.done}/${e.total}] · ok=${e.summary?.succeeded ?? '?'} failed=${e.summary?.failed ?? '?'}`;
    case 'track-failed':  return `   ✗ failed · ${e.error}`;
    case 'done':          return `■ Complete · ${e.summary?.succeeded ?? '?'} ok, ${e.summary?.failed ?? '?'} failed`;
    default:              return JSON.stringify(e);
  }
}

/* ═══════════════════════════════════════════════════════════
   Shared spawn helper
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
   Helper: absolute src
   ═══════════════════════════════════════════════════════════ */
function absolutizeSrc(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return `${MATB3AA_AUDIO_BASE.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
}

/* ═══════════════════════════════════════════════════════════
   Helper: fetch one artist's catalogue from matb3aa
   ═══════════════════════════════════════════════════════════ */
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
    const j = await matb3aa.api(
      `/artists/${artistId}/tracks?perPage=100&page=${page}`
    );
    const items = j.pagination?.data || [];
    if (!items.length) break;
    allTracks.push(...items);
    if (!j.pagination?.next_page) break;
  }

  const allAlbums = [];
  for (let page = 1; page <= 10; page++) {
    const j = await matb3aa.api(
      `/artists/${artistId}/albums?perPage=100&page=${page}`
    );
    const items = j.pagination?.data || [];
    if (!items.length) break;
    allAlbums.push(...items);
    if (!j.pagination?.next_page) break;
  }

  const trackMap = new Map();

  for (const t of allTracks) {
    trackMap.set(t.id, {
      id: t.id,
      name: t.name,
      src: absolutizeSrc(t.src),
      duration: t.duration,
      album_id: null,
      album_name: null,
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
            id: t.id,
            name: t.name,
            src: absolutizeSrc(t.src),
            duration: t.duration,
            album_id: album.id,
            album_name: album.name,
          });
        }
      }
    } catch (e) {
      console.warn(`[instrumental] album ${album.id} failed:`, e.message);
    }
  }

  return { artist, tracks: [...trackMap.values()] };
}

/* ═══════════════════════════════════════════════════════════
   POST /api/instrumental/batch
   Cut + demucs locally. Writes MP3s to server/instrumental-output/.
   ═══════════════════════════════════════════════════════════ */
router.post('/instrumental/batch', async (req, res) => {
  const segmentLengthSec = Number(req.body?.segmentLengthSec) || 10;
  const bitrate = String(req.body?.bitrate ?? '64k');

  const tracksIn  = Array.isArray(req.body?.tracks)  ? req.body.tracks  : null;
  const artistsIn = Array.isArray(req.body?.artists) ? req.body.artists : null;

  let allTracks = [];
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
      ok: false,
      count: 0,
      message: 'No tracks with a source URL found.',
      failures,
    });
  }

  try { mkdirSync(TMP_DIR, { recursive: true }); } catch { /* exists */ }
  const tracksFile = join(TMP_DIR, `instr-${randomUUID()}.json`);
  writeFileSync(tracksFile, JSON.stringify(allTracks), 'utf8');

  const { job, error } = spawnAndTrackJob({
    scriptPath: BATCH_SCRIPT,
    args: [
      `--tracks-file=${tracksFile}`,
      `--segment-length=${segmentLengthSec}`,
      `--bitrate=${bitrate}`,
    ],
    scope: 'instrumental-batch',
    jobArgs: {
      total: allTracks.length,
      artists: new Set(allTracks.map(t => t.artistId).filter(Boolean)).size,
      segmentLengthSec,
      bitrate,
    },
    formatter: formatBatchEvent,
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
   GET /api/instrumental/local?artist_ids=1,2,3
   Scan server/instrumental-output/ for ready-to-upload tracks.
   ═══════════════════════════════════════════════════════════ */
router.get('/instrumental/local', async (req, res) => {
  const idsParam = String(req.query.artist_ids ?? '').trim();
  const wantedIds = idsParam
    ? new Set(idsParam.split(',').map(s => Number(s.trim())).filter(Number.isInteger))
    : null;

  let artistDirs;
  try {
    artistDirs = readdirSync(OUTPUT_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory());
  } catch {
    return res.json({ items: [] });
  }

  const items = [];

  for (const ad of artistDirs) {
    const m = ad.name.match(/^(\d+)_/);
    if (!m) continue;
    const artistId = Number(m[1]);
    if (wantedIds && !wantedIds.has(artistId)) continue;

    const artistDir = join(OUTPUT_ROOT, ad.name);
    let trackDirs;
    try {
      trackDirs = readdirSync(artistDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
    } catch { continue; }

    for (const td of trackDirs) {
      const trackDir = join(artistDir, td.name);
      const metaPath = join(trackDir, 'meta.json');
      if (!existsSync(metaPath)) continue;

      let meta;
      try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); }
      catch { continue; }

      const segments = [];
      for (const seg of meta.segments ?? []) {
        const filePath = join(trackDir, seg.file);
        if (!existsSync(filePath)) continue;
        segments.push({
          seg: seg.seg,
          file: seg.file,
          absolutePath: filePath,
        });
      }
      if (segments.length === 0) continue;

      items.push({
        artistId:   meta.artistId,
        artistName: meta.artistName,
        trackId:    meta.trackId,
        trackName:  meta.trackName,
        albumName:  meta.albumName ?? null,
        sourceUrl:  meta.sourceUrl ?? null,
        segments,
      });
    }
  }

  return res.json({ items });
});

/* ═══════════════════════════════════════════════════════════
   POST /api/instrumental/upload
   Body: { items: [{ artistId, artistName, trackId, trackName,
                     albumName, sourceUrl, genreIds, segments: [...] }] }
   → { job, count }
   ═══════════════════════════════════════════════════════════ */
router.post('/instrumental/upload', async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const ready = items.filter(it =>
    Array.isArray(it.segments) && it.segments.length > 0
  );
  if (ready.length === 0) {
    return res.status(200).json({ ok: true, count: 0, message: 'Nothing to upload.' });
  }

  try { mkdirSync(TMP_DIR, { recursive: true }); } catch { /* exists */ }
  const tracksFile = join(TMP_DIR, `upload-${randomUUID()}.json`);
  writeFileSync(tracksFile, JSON.stringify(ready), 'utf8');

  const { job, error } = spawnAndTrackJob({
    scriptPath: UPLOAD_SCRIPT,
    args: [
      `--tracks-file=${tracksFile}`,
      `--remove-local=1`,
    ],
    scope: 'instrumental-upload',
    jobArgs: { total: ready.length },
    formatter: formatUploadEvent,
  });

  if (error) {
    return res.status(500).json({ error, job: publicJob(job) });
  }

  return res.status(201).json({
    job: publicJob(job),
    count: ready.length,
  });
});



/* ═══════════════════════════════════════════════════════════
   GET /api/instrumental/uploaded?artist_ids=1,2,3
   Returns tracks whose local folder has meta.json but NO MP3s
   — i.e. tracks that were already uploaded and had their files
   cleaned up.
   → { uploaded: [{ artistId, trackName, artistName }] }
   ═══════════════════════════════════════════════════════════ */
router.get('/instrumental/uploaded', async (req, res) => {
  const idsParam = String(req.query.artist_ids ?? '').trim();
  const wantedIds = idsParam
    ? new Set(idsParam.split(',').map(s => Number(s.trim())).filter(Number.isInteger))
    : null;

  let artistDirs;
  try {
    artistDirs = readdirSync(OUTPUT_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory());
  } catch {
    return res.json({ uploaded: [] });
  }

  const uploaded = [];

  for (const ad of artistDirs) {
    const m = ad.name.match(/^(\d+)_/);
    if (!m) continue;
    const artistId = Number(m[1]);
    if (wantedIds && !wantedIds.has(artistId)) continue;

    const artistDir = join(OUTPUT_ROOT, ad.name);
    let trackDirs;
    try {
      trackDirs = readdirSync(artistDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
    } catch { continue; }

    for (const td of trackDirs) {
      const trackDir = join(artistDir, td.name);
      const metaPath = join(trackDir, 'meta.json');
      if (!existsSync(metaPath)) continue;

      let meta;
      try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); }
      catch { continue; }

      // Does the folder still have ANY segment MP3s?
      let hasAnyMp3 = false;
      for (const seg of meta.segments ?? []) {
        const filePath = join(trackDir, seg.file);
        if (existsSync(filePath)) { hasAnyMp3 = true; break; }
      }

      // No MP3s → track was uploaded and files were cleaned up
      if (!hasAnyMp3) {
        uploaded.push({
          artistId: meta.artistId,
          artistName: meta.artistName,
          trackName: meta.trackName,
        });
      }
    }
  }

  return res.json({ uploaded });
});


/* ═══════════════════════════════════════════════════════════
   GET /api/instrumental/status?artist_ids=1,2,3
   Returns every locally-generated track for the given artists,
   with a flag for whether it's ready to upload or already uploaded.

   → {
       tracks: [
         {
           artistId, artistName, trackId, trackName,
           albumName, sourceUrl,
           uploaded: false,         // still has MP3s → ready to upload
           segments: [              // present segments
             { seg: 'middle', file: 'seg_middle.mp3', absolutePath: '…' },
             { seg: 'custom', file: 'seg_custom.mp3', absolutePath: '…' },
           ],
         },
         {
           artistId, artistName, trackId, trackName,
           albumName, sourceUrl,
           uploaded: true,          // only meta.json remains
           segments: [],            // no MP3s on disk
         },
         …
       ]
     }
   ═══════════════════════════════════════════════════════════ */
router.get('/instrumental/status', async (req, res) => {
  const idsParam = String(req.query.artist_ids ?? '').trim();
  const wantedIds = idsParam
    ? new Set(idsParam.split(',').map(s => Number(s.trim())).filter(Number.isInteger))
    : null;

  let artistDirs;
  try {
    artistDirs = readdirSync(OUTPUT_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory());
  } catch {
    return res.json({ tracks: [] });
  }

  const tracks = [];

  for (const ad of artistDirs) {
    const m = ad.name.match(/^(\d+)_/);
    if (!m) continue;
    const artistId = Number(m[1]);
    if (wantedIds && !wantedIds.has(artistId)) continue;

    const artistDir = join(OUTPUT_ROOT, ad.name);
    let trackDirs;
    try {
      trackDirs = readdirSync(artistDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
    } catch { continue; }

    for (const td of trackDirs) {
      const trackDir = join(artistDir, td.name);
      const metaPath = join(trackDir, 'meta.json');
      if (!existsSync(metaPath)) continue;

      let meta;
      try { meta = JSON.parse(readFileSync(metaPath, 'utf8')); }
      catch { continue; }

      const segments = [];
      for (const seg of meta.segments ?? []) {
        const filePath = join(trackDir, seg.file);
        if (!existsSync(filePath)) continue;
        segments.push({
          seg: seg.seg,
          file: seg.file,
          absolutePath: filePath,
        });
      }

      const uploaded = segments.length === 0;   // no MP3s = already uploaded

      tracks.push({
        artistId: meta.artistId,
        artistName: meta.artistName,
        trackId: meta.trackId,
        trackName: meta.trackName,
        albumName: meta.albumName ?? null,
        sourceUrl: meta.sourceUrl ?? null,
        uploaded,
        segments,
      });
    }
  }

  return res.json({ tracks });
});

export default router;