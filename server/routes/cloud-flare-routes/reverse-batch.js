// server/routes/cloud-flare-routes/reverse-batch.js
//
// POST /api/cloudflare/tracks/reverse-batch
//
// Queries D1 for all slots that have a forward clip but no reversed
// clip, then spawns a background job to reverse them one by one.
//
// Reuses the pipeline job registry and progress protocol.

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
  attachChild,
  updateFromLine,
  appendLog,
  finishJob,
  publicJob,
} from '../../lib/job-registry.js';
import { cloudflare } from './cloudflare.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '..', '..', 'scripts', 'reverse-batch.js');
const TMP_DIR     = join(__dirname, '..', '..', 'tmp-preview-test');

const router = Router();

// Sanity cap — matches the Worker's /tracks limit of 20000.
// The child processes sequentially, so this is a run-away protection,
// not a workflow limit.
const MAX_BATCH = 20000;

router.post('/tracks/reverse-batch', async (req, res) => {
  const limitRaw = req.body?.limit;
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, MAX_BATCH)
    : null;

  // ── Query the Worker for missing-reverse slot IDs ─────
  // The Worker's /tracks endpoint supports both has_forward and
  // has_reversed filters. Using both narrows the query server-side
  // to slots that have a forward clip but no reversed rendition.
  //
  // This is critical: without has_reversed=0, the Worker returns
  // slots regardless of reverse status, and the local filter runs
  // on a truncated page that may contain only already-reversed rows.
  let allTracks;
  try {
    const data = await cloudflare.get(
      '/tracks?has_forward=1&has_reversed=0&limit=20000'
    );
    allTracks = data?.tracks ?? [];
  } catch (e) {
    return res.status(502).json({ error: `Failed to list tracks: ${e.message}` });
  }

  // The Worker already filtered server-side. The local filter is a
  // defensive check in case the contract changes.
  const missing = allTracks
    .filter(t => t.r2_key && !t.r2_reversed_key)
    .map(t => t.id);

  if (missing.length === 0) {
    return res.status(200).json({
      ok: true,
      count: 0,
      message: 'No tracks need a reversed rendition.',
    });
  }

  const ids = limit ? missing.slice(0, limit) : missing;

  // ── Write the ID list to a temp file ──────────────────
  try { mkdirSync(TMP_DIR, { recursive: true }); } catch { /* exists */ }
  const idsFile = join(TMP_DIR, `reverse-batch-${randomUUID()}.json`);
  try {
    writeFileSync(idsFile, JSON.stringify(ids), 'utf8');
  } catch (e) {
    return res.status(500).json({ error: `Failed to write ids file: ${e.message}` });
  }

  // ── Spawn the child process ───────────────────────────
  const job = createJob({
    scope: 'reverse-batch',
    args: { total: ids.length, limit },
  });

  const scriptPath = existsSync(SCRIPT_PATH) ? SCRIPT_PATH : null;
  const finalArgs = scriptPath
    ? [scriptPath, `--ids-file=${idsFile}`]
    : ['-e', 'console.log(JSON.stringify({stage:"noop",status:"done"}))'];

  let child;
  try {
    child = spawn(process.execPath, finalArgs, { env: process.env });
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
        updateFromLine(job.id, JSON.parse(trimmed));
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
    if (current.status === 'cancelled') return;
    if (current.status === 'done' || current.status === 'failed') return;
    if (code === 0) finishJob(job.id, { status: 'done' });
    else if (signal) finishJob(job.id, { status: 'cancelled', error: `killed by ${signal}` });
    else finishJob(job.id, { status: 'failed', error: `exit code ${code}` });
  });

  child.on('error', (e) => {
    finishJob(job.id, { status: 'failed', error: e.message });
  });

  return res.status(201).json({ job: publicJob(job), count: ids.length });
});

export default router;