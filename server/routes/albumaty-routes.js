// server/routes/albumaty-routes.js
/**
 * Albumaty crawl + publish orchestration.
 *
 * - GET  /api/albumaty/singers              list of albumaty singers (live fetch, cached 5min)
 * - POST /api/albumaty/crawl                { albumatyId } → full artist data (no storage)
 * - POST /api/albumaty/publish-jobs         { artists: [{ albumatyId, name, image, tracks }] } → { jobId }
 * - GET  /api/albumaty/publish-jobs/:id     → { status, progress, ... }
 * - POST /api/albumaty/publish-jobs/:id/cancel
 */

import { Router } from 'express';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { crawlArtist, fetchSingers } from '../lib/albumaty-crawl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOB_SCRIPT = join(__dirname, '..', 'scripts', 'albumaty-crawl', 'publish-job.js');

const router = Router();

/* ═══════════════════════════════════════════════════════════
   Singers list (live fetch, cached 5 minutes)
   ═══════════════════════════════════════════════════════════ */

let singersCache = { at: 0, data: null };
const SINGERS_TTL_MS = 5 * 60 * 1000;

router.get('/singers', async (req, res) => {
  try {
    const now = Date.now();
    if (singersCache.data && now - singersCache.at < SINGERS_TTL_MS) {
      return res.json({
        singers: singersCache.data,
        count: singersCache.data.length,
        cachedAt: new Date(singersCache.at).toISOString(),
      });
    }
    const singers = await fetchSingers();
    singersCache = { at: now, data: singers };
    res.json({
      singers,
      count: singers.length,
      cachedAt: new Date(now).toISOString(),
    });
  } catch (e) {
    console.error('[albumaty/singers]', e);
    res.status(502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   Crawl one artist (no storage — returns to caller)
   ═══════════════════════════════════════════════════════════ */

router.post('/crawl', async (req, res) => {
  try {
    const { albumatyId } = req.body ?? {};
    if (!Number.isInteger(Number(albumatyId))) {
      return res.status(400).json({ error: 'albumatyId must be an integer' });
    }
    const data = await crawlArtist(Number(albumatyId));
    res.json(data);
  } catch (e) {
    console.error('[albumaty/crawl]', e);
    res.status(502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   Publish jobs — one job spans N artists
   ═══════════════════════════════════════════════════════════ */

const jobs = new Map();
const MAX_LOG_LINES = 200;

/**
 * Validate one artist entry in the payload.
 * Returns a string error, or null if valid.
 */
function validateArtist(artist, index) {
  if (!Number.isInteger(Number(artist?.albumatyId))) {
    return `artists[${index}].albumatyId must be an integer`;
  }
  if (!artist?.name || typeof artist.name !== 'string') {
    return `artists[${index}].name is required`;
  }
  if (!Array.isArray(artist?.tracks) || artist.tracks.length === 0) {
    return `artists[${index}].tracks must be a non-empty array`;
  }
  for (let i = 0; i < artist.tracks.length; i++) {
    const t = artist.tracks[i];
    if (!Number.isInteger(Number(t?.albumatySongId)) || !t?.name) {
      return `artists[${index}].tracks[${i}] must have albumatySongId and name`;
    }
  }
  return null;
}

function makeJob({ artists }) {
  const id = randomUUID();
  const totalTracks = artists.reduce((sum, a) => sum + a.tracks.length, 0);
  const job = {
    id,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    artistsTotal: artists.length,
    artistNames: artists.map(a => a.name),
    tracksTotal: totalTracks,
    status: 'starting',
    stage: null,
    progress: {
      done: 0,
      total: totalTracks,
      artistsDone: 0,
      artistsTotal: artists.length,
    },
    summary: null,
    error: null,
    log: [],
    child: null,
  };
  jobs.set(id, job);
  return job;
}

function appendLog(job, line) {
  job.log.push(line);
  if (job.log.length > MAX_LOG_LINES) job.log.splice(0, job.log.length - MAX_LOG_LINES);
}

function applyProgressLine(job, payload) {
  if (typeof payload.stage === 'string') job.stage = payload.stage;

  if (typeof payload.done === 'number' && typeof payload.total === 'number') {
    job.progress.done = payload.done;
    job.progress.total = payload.total;
  }
  if (typeof payload.artistsDone === 'number') {
    job.progress.artistsDone = payload.artistsDone;
  }
  if (typeof payload.artistsTotal === 'number') {
    job.progress.artistsTotal = payload.artistsTotal;
  }
  if (payload.summary) job.summary = payload.summary;

  if (payload.status === 'done') {
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
  } else if (payload.status === 'failed') {
    job.status = 'failed';
    job.error = payload.error ?? 'unknown';
    job.finishedAt = new Date().toISOString();
  }
}

function publicJob(job) {
  if (!job) return null;
  const { child, ...rest } = job;
  return rest;
}

router.post('/publish-jobs', async (req, res) => {
  const { artists } = req.body ?? {};

  if (!Array.isArray(artists) || artists.length === 0) {
    return res.status(400).json({ error: 'artists must be a non-empty array' });
  }

  for (let i = 0; i < artists.length; i++) {
    const err = validateArtist(artists[i], i);
    if (err) return res.status(400).json({ error: err });
  }

  const job = makeJob({ artists });
  const payload = { artists };

  let child;
  try {
    child = spawn(process.execPath, [JOB_SCRIPT], {
      env: { ...process.env, ALBUMATY_JOB_PAYLOAD: JSON.stringify(payload) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    job.status = 'failed';
    job.error = `spawn failed: ${e.message}`;
    return res.status(500).json({ error: job.error, job: publicJob(job) });
  }

  job.child = child;
  job.status = 'running';

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        applyProgressLine(job, JSON.parse(trimmed));
        return;
      } catch { /* fall through to log */ }
    }
    appendLog(job, trimmed);
  });

  const rlErr = readline.createInterface({ input: child.stderr });
  rlErr.on('line', line => {
    if (line.trim()) appendLog(job, `[stderr] ${line}`);
  });

  child.on('exit', (code, signal) => {
    const current = jobs.get(job.id);
    if (!current) return;
    if (current.status === 'cancelled') return;
    if (current.status === 'done' || current.status === 'failed') return;
    if (code === 0) {
      current.status = 'done';
    } else if (signal) {
      current.status = 'cancelled';
      current.error = `killed by ${signal}`;
    } else {
      current.status = 'failed';
      current.error = `exit code ${code}`;
    }
    current.finishedAt = new Date().toISOString();
    current.child = null;
  });

  child.on('error', (e) => {
    job.status = 'failed';
    job.error = e.message;
    job.finishedAt = new Date().toISOString();
  });

  res.status(201).json({ job: publicJob(job) });
});

router.get('/publish-jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job: publicJob(job) });
});

router.post('/publish-jobs/:id/cancel', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'running' && job.status !== 'starting') {
    return res.status(400).json({ error: `Cannot cancel: ${job.status}` });
  }
  if (job.child && !job.child.killed) {
    try { job.child.kill('SIGKILL'); } catch { /* ignore */ }
  }
  job.status = 'cancelled';
  job.finishedAt = new Date().toISOString();
  job.child = null;
  res.json({ ok: true, job: publicJob(job) });
});

export default router;