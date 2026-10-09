// server/routes/pipeline-routes.js
import { Router } from 'express';
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import {
  createJob,
  getJob,
  listJobs,
  attachChild,
  updateFromLine,
  appendLog,
  finishJob,
  cancelJob,
  publicJob,
} from '../lib/job-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUN_SCRIPT          = join(__dirname, '..', 'scripts', 'pipeline', 'run.js');
const ALBUM_YEARS_SCRIPT  = join(__dirname, '..', 'scripts', 'pipeline', 'album-years.js');
const TMP_DIR             = join(__dirname, '..', 'tmp-preview-test');

const router = Router();

// ── Guards ─────────────────────────────────────────────────
// Sanity rails, not workflow limits. The catalogue is well under
// 400 artists, so these are effectively unreachable in normal use.
// Keep in sync with:
//   - server/scripts/pipeline/album-years.js
//   - admin/src/components/domain/.../AlbumYearsBatchModal.jsx
const MAX_ARTISTS = 400;
const MAX_PAIRS   = 10000;

/* ═══════════════════════════════════════════════════════════
   POST /api/pipeline/jobs

   Body (one of):
     { scope: 'artist', artistId: 65 }
     { scope: 'artists', artistIds: [65, 9, 42] }
     { scope: 'missing-only' }

     { scope: 'album-years', pairs: [
         { artist_id: 9, artist_name: 'عمرو دياب', album_names: [...] },
         ...
     ]}
   ═══════════════════════════════════════════════════════════ */

router.post('/jobs', async (req, res) => {
  const body = req.body ?? {};
  const scope = String(body.scope ?? '');

  let scriptPath;
  let cmdArgs = [];

  if (scope === 'artist' || scope === 'artists' || scope === 'missing-only') {
    /* ── Lyrics pipeline ───────────────────────────── */
    if (scope === 'artist') {
      const id = Number(body.artistId);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'artistId must be a positive integer' });
      }
      cmdArgs.push(`--artist=${id}`);
    } else if (scope === 'artists') {
      const ids = Array.isArray(body.artistIds) ? body.artistIds : [];
      const clean = ids.map(Number).filter(n => Number.isInteger(n) && n > 0);
      if (clean.length === 0) {
        return res.status(400).json({ error: 'artistIds must be a non-empty array of positive integers' });
      }
      cmdArgs.push(`--artists=${clean.join(',')}`);
    } else {
      cmdArgs.push('--missing-only');
    }
    scriptPath = existsSync(RUN_SCRIPT) ? RUN_SCRIPT : null;

  } else if (scope === 'album-years') {
    /* ── Album-years batch pipeline ────────────────── */
    const pairs = Array.isArray(body.pairs) ? body.pairs : null;
    if (!pairs || pairs.length === 0) {
      return res.status(400).json({ error: 'pairs must be a non-empty array' });
    }
    if (pairs.length > MAX_ARTISTS) {
      return res.status(400).json({ error: `Too many artists: ${pairs.length} > ${MAX_ARTISTS}` });
    }

    // Normalise + validate.
    const clean = [];
    let totalPairs = 0;
    for (const p of pairs) {
      const artistId = Number(p?.artist_id);
      const artistName = String(p?.artist_name ?? '');
      const albumNames = Array.isArray(p?.album_names)
        ? p.album_names.map(n => String(n ?? '').trim()).filter(Boolean)
        : [];
      if (!Number.isInteger(artistId) || artistId <= 0) {
        return res.status(400).json({ error: `Invalid artist_id in pairs: ${p?.artist_id}` });
      }
      if (albumNames.length === 0) continue;
      totalPairs += albumNames.length;
      clean.push({ artist_id: artistId, artist_name: artistName, album_names: albumNames });
    }

    if (clean.length === 0) {
      return res.status(400).json({ error: 'No valid pairs (all had empty album_names)' });
    }
    if (totalPairs > MAX_PAIRS) {
      return res.status(400).json({ error: `Too many album pairs: ${totalPairs} > ${MAX_PAIRS}` });
    }

    // Write pairs to a temp file so argv stays short.
    try { mkdirSync(TMP_DIR, { recursive: true }); } catch { /* exists */ }
    const pairsFile = join(TMP_DIR, `album-years-pairs-${randomUUID()}.json`);
    try {
      writeFileSync(pairsFile, JSON.stringify(clean), 'utf8');
    } catch (e) {
      return res.status(500).json({ error: `Failed to write pairs file: ${e.message}` });
    }

    scriptPath = existsSync(ALBUM_YEARS_SCRIPT) ? ALBUM_YEARS_SCRIPT : null;
    cmdArgs.push(`--pairs-file=${pairsFile}`);

  } else {
    return res.status(400).json({
      error: 'scope must be one of: artist, artists, missing-only, album-years',
    });
  }

  /* ── Spawn ─────────────────────────────────────────────── */
  const job = createJob({ scope, args: body });

  const cmd = process.execPath;
  const finalArgs = scriptPath
    ? [scriptPath, ...cmdArgs]
    : ['-e', 'console.log(JSON.stringify({stage:"noop",status:"done"}))'];

  let child;
  try {
    child = spawn(cmd, finalArgs, { env: process.env });
  } catch (e) {
    finishJob(job.id, { status: 'failed', error: `spawn failed: ${e.message}` });
    return res.status(500).json({ error: e.message, job: publicJob(job) });
  }

  attachChild(job.id, child);

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        updateFromLine(job.id, parsed);
        return;
      } catch { /* fallthrough to log */ }
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
    if (current.status === 'cancelled') return;
    if (current.status === 'done' || current.status === 'failed') return;
    if (code === 0) finishJob(job.id, { status: 'done' });
    else if (signal) finishJob(job.id, { status: 'cancelled', error: `killed by ${signal}` });
    else finishJob(job.id, { status: 'failed', error: `exit code ${code}` });
  });

  child.on('error', (e) => {
    finishJob(job.id, { status: 'failed', error: e.message });
  });

  return res.status(201).json({ job: publicJob(job) });
});

/* ═══════════════════════════════════════════════════════════
   GET /api/pipeline/jobs
   ═══════════════════════════════════════════════════════════ */

router.get('/jobs', (req, res) => {
  res.json({ jobs: listJobs().map(publicJob) });
});

/* ═══════════════════════════════════════════════════════════
   GET /api/pipeline/jobs/:id
   ═══════════════════════════════════════════════════════════ */

router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job: publicJob(job) });
});

/* ═══════════════════════════════════════════════════════════
   POST /api/pipeline/jobs/:id/cancel
   ═══════════════════════════════════════════════════════════ */

router.post('/jobs/:id/cancel', (req, res) => {
  const result = cancelJob(req.params.id);
  if (!result.ok) {
    return res.status(400).json({ error: `Cannot cancel: ${result.reason}` });
  }
  const job = getJob(req.params.id);
  res.json({ ok: true, job: publicJob(job) });
});

export default router;