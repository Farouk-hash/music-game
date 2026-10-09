// server/lib/job-registry.js
import { randomUUID } from 'node:crypto';

/**
 * In-memory job registry for long-running pipeline jobs.
 *
 * Not persisted — jobs vanish when the server restarts. That's fine:
 * the underlying pipeline is idempotent (upserts), so a re-run after
 * a crash picks up where the previous run left off.
 *
 * Job shape:
 *   {
 *     id, createdAt,
 *     scope:    'artist' | 'artists' | 'missing-only',
 *     args:     { artistId?, artistIds?, missingOnly? },
 *     status:   'starting' | 'running' | 'done' | 'failed' | 'cancelled',
 *     stage:    string | null,
 *     progress: { done, total } | null,
 *     summary:  object | null,
 *     error:    string | null,
 *     log:      string[],      // last N lines of non-JSON stdout
 *     child:    ChildProcess | null,
 *     startedAt, finishedAt,
 *   }
 */

const MAX_LOG_LINES = 200;
const jobs = new Map();

export function createJob({ scope, args = {} }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const job = {
    id,
    createdAt: now,
    startedAt: now,
    finishedAt: null,
    scope,
    args,
    status: 'starting',
    stage: null,
    progress: null,
    summary: null,
    error: null,
    log: [],
    child: null,
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id) {
  return jobs.get(id) ?? null;
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function attachChild(jobId, child) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.child = child;
  job.status = 'running';
}

/**
 * Apply one parsed progress line from the child process.
 * Expected shape:
 *   { stage: string, done?: number, total?: number,
 *     summary?: object, status?: 'running'|'done'|'failed'|'cancelled' }
 */
export function updateFromLine(jobId, payload) {
  const job = jobs.get(jobId);
  if (!job) return;

  if (typeof payload.stage === 'string') job.stage = payload.stage;
  if (typeof payload.done === 'number' && typeof payload.total === 'number') {
    job.progress = { done: payload.done, total: payload.total };
  }
  if (payload.summary) job.summary = payload.summary;
  if (payload.status === 'done') {
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
  } else if (payload.status === 'failed') {
    job.status = 'failed';
    if (payload.error) job.error = String(payload.error);
    job.finishedAt = new Date().toISOString();
  }
}

export function appendLog(jobId, line) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.log.push(line);
  if (job.log.length > MAX_LOG_LINES) {
    job.log.splice(0, job.log.length - MAX_LOG_LINES);
  }
}

export function finishJob(jobId, { status, error = null }) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  if (error) job.error = String(error);
  job.finishedAt = new Date().toISOString();
  job.child = null;
}

export function cancelJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return { ok: false, reason: 'not-found' };
  if (job.status !== 'running' && job.status !== 'starting') {
    return { ok: false, reason: 'not-running' };
  }
  if (job.child && !job.child.killed) {
    try {
      job.child.kill('SIGKILL');
    } catch (e) {
      // Non-fatal — process may have already exited.
    }
  }
  finishJob(jobId, { status: 'cancelled' });
  return { ok: true };
}

/**
 * Serialisable view for the API. Strips the child process handle.
 */
export function publicJob(job) {
  if (!job) return null;
  const { child, ...rest } = job;
  return rest;
}