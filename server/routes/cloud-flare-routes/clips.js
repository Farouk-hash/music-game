// server/routes/cloud-flare-routes/clips.js
import { Router } from 'express';
import { publishClip, reverseExistingClip } from '../../lib/publish-clip.js';
import { cloudflare } from './cloudflare.js';
import reverseBatchRouter from './reverse-batch.js';

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

const router = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVERSE_BATCH_SCRIPT = join(__dirname, '..', '..', 'scripts', 'reverse-batch.js');
const TMP_DIR = join(__dirname, '..', '..', 'tmp-preview-test');
const MAX_REVERSE_BATCH = 10000;


async function upsertAlbumYear({ artistId, albumName, releasedYear, loggerPrefix = '  ' }) {
  if (!albumName) return;
  const year = Number(releasedYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return;

  try {
    await cloudflare.post('/album-years/bulk', {
      items: [{
        artist_id: Number(artistId),
        album_name: String(albumName),
        released_year: year,
      }],
    });
  } catch (e) {
    console.warn(`${loggerPrefix}[album-year] upsert failed for "${albumName}": ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// Shared helper: publish renditions for one slot + save one row
// ═══════════════════════════════════════════════════════════

async function publishAndSaveSlot({
  trackId, sourceSrc, name, artistId, position,
  startSec = 0, duration, forward, reversed, label,
  albumName = null,
  releasedYear = null,          
  featuredArtists = null,
  source = 'music',
  loggerPrefix = '  ',
}) {
  const out = { forward: null, reversed: null };
  const errors = [];

  if (forward) {
    try {
      out.forward = await publishClip({
        trackId, sourceSrc, name, artistId, position,
        startSec, seconds: duration, label, source, reversed: false,
        onProgress: (stage, data) =>
          console.log(`${loggerPrefix}[fwd ${name} ${position}] ${stage}`, data ?? ''),
      });
    } catch (e) {
      errors.push({ rendition: 'forward', error: e.message, code: e.code ?? null });
    }
  }

  if (reversed) {
    try {
      out.reversed = await publishClip({
        trackId, sourceSrc, name, artistId, position,
        startSec, seconds: duration, label, source, reversed: true,
        onProgress: (stage, data) =>
          console.log(`${loggerPrefix}[rev ${name} ${position}] ${stage}`, data ?? ''),
      });
    } catch (e) {
      errors.push({ rendition: 'reversed', error: e.message, code: e.code ?? null });
    }
  }

  const r2Key         = out.forward?.r2_key  ?? null;
  const r2ReversedKey = out.reversed?.r2_key ?? null;

  if (!r2Key && !r2ReversedKey) {
    return { slotId: null, out, errors };
  }

  // ── Upsert the album year before the tracks write ──
  // Independent write; runs even if the tracks insert later 409s.
  await upsertAlbumYear({ artistId, albumName, releasedYear, loggerPrefix });

  let slotId = null;
  try {
    const saved = await cloudflare.post('/tracks', {
      name,
      artist_id: artistId,
      r2_key: r2Key,
      r2_reversed_key: r2ReversedKey,
      position,
      label,
      album_name: albumName,
      featured_artists: featuredArtists,
    });
    slotId = saved?.track?.id ?? null;
  } catch (e) {
    if (e.status === 409) {
      try {
        const list = await cloudflare.get(
          `/tracks?artist_id=${artistId}&search=${encodeURIComponent(name)}`
        );
        const match = list?.tracks?.find(
          t => t.name === name && t.position === position
        );
        if (!match) throw new Error('Slot exists but could not be located');

        const updated = await cloudflare.put(`/tracks/${match.id}`, {
          name,
          artist_id: artistId,
          r2_key: r2Key ?? match.r2_key,
          r2_reversed_key: r2ReversedKey ?? match.r2_reversed_key,
          position,
          label,
          album_name: albumName ?? match.album_name ?? null,
          featured_artists: featuredArtists ?? match.featured_artists ?? null,
        });
        slotId = updated?.track?.id ?? match.id;
      } catch (inner) {
        errors.push({ rendition: 'save', error: inner.message, code: inner.code ?? null });
      }
    } else {
      errors.push({ rendition: 'save', error: e.message, code: e.code ?? null });
    }
  }

  return { slotId, out, errors };
}
// ═══════════════════════════════════════════════════════════
// SINGLE CLIP — one shot (used for testing and one-off publishes)
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/cloudflare/tracks/publish-clip
 * Body: {
 *   trackId, sourceSrc, name, artistId, position?,
 *   startSec?, seconds?, label?, album_name?,
 *   forward? (default true), reversed? (default false)
 * }
 */
router.post('/tracks/publish-clip', async (req, res) => {
  const {
    trackId, sourceSrc, name, artistId,
    position = 'start', startSec = 0, seconds = 10, label = null,
    album_name = null,
    forward = true, reversed = false,
  } = req.body ?? {};

  if (!trackId)   return res.status(400).json({ error: 'trackId is required' });
  if (!sourceSrc) return res.status(400).json({ error: 'sourceSrc is required' });
  if (!name)      return res.status(400).json({ error: 'name is required' });
  if (!artistId)  return res.status(400).json({ error: 'artistId is required' });
  if (!forward && !reversed) {
    return res.status(400).json({ error: 'at least one of forward/reversed must be true' });
  }

  try {
    const result = await publishAndSaveSlot({
      trackId, sourceSrc, name, artistId, position,
      startSec, duration: seconds, forward, reversed, label,
      albumName: album_name,
      loggerPrefix: '  ',
    });

    const successes = [];
    if (result.out.forward) {
      successes.push({
        rendition: 'forward',
        slotId: result.slotId,
        ...result.out.forward,
      });
    }
    if (result.out.reversed) {
      successes.push({
        rendition: 'reversed',
        slotId: result.slotId,
        ...result.out.reversed,
      });
    }

    const ok = successes.length > 0 && result.errors.length === 0;
    const status = successes.length === 0 ? 500 : 200;

    res.status(status).json({
      ok,
      slotId: result.slotId,
      results: successes,
      errors: result.errors,
    });
  } catch (e) {
    console.error('[publish-clip]', e);
    res.status(e.status ?? 500).json({ error: e.message, code: e.code ?? null });
  }
});

/** GET /api/cloudflare/tracks/artists-with-clips?search= */
router.get('/tracks/artists-with-clips', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.search) params.set('search', req.query.search);
    const qs = params.toString();
    const data = await cloudflare.get(
      '/tracks/artists-with-clips' + (qs ? `?${qs}` : '')
    );
    res.json({ artists: data?.artists ?? [] });
  } catch (e) {
    console.error('[cloudflare/tracks/artists-with-clips]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// BATCH — publish many clips in one request
// ═══════════════════════════════════════════════════════════

/** PUT /api/cloudflare/tracks/:id — update a clip's metadata */
router.put('/tracks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const result = await cloudflare.put(`/tracks/${id}`, req.body ?? {});
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/tracks PUT ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/** DELETE /api/cloudflare/tracks/:id — delete a whole slot (both renditions) */
router.delete('/tracks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const result = await cloudflare.delete(`/tracks/${id}`);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/tracks DELETE ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/** DELETE /api/cloudflare/tracks/:id/reversed — drop only the reversed rendition */
router.delete('/tracks/:id/reversed', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const result = await cloudflare.delete(`/tracks/${id}/reversed`);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/tracks DELETE ${req.params.id}/reversed]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/**
 * POST /api/cloudflare/tracks/publish-clips
 * Body: {
 *   clips: [
 *     {
 *       trackId, sourceSrc, name, artistId, position,
 *       startSec?, seconds?, label?, album_name?,
 *       forward? (default true), reversed? (default false)
 *     },
 *     ...
 *   ]
 * }
 *
 * Each clip entry describes ONE slot. forward/reversed select which
 * renditions to produce for that slot. One D1 row is written per slot.
 *
 * Concurrency limit of 3 (FFmpeg is CPU-bound).
 */
router.post('/tracks/publish-clips', async (req, res) => {
  const { clips } = req.body ?? {};

  if (!Array.isArray(clips) || clips.length === 0) {
    return res.status(400).json({ error: 'clips must be a non-empty array' });
  }
  if (clips.length > 3000) {
    return res.status(400).json({ error: 'maximum 3000 clips per batch' });
  }

  const required = ['trackId', 'sourceSrc', 'name', 'artistId', 'position'];
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    for (const field of required) {
      if (!c[field]) {
        return res.status(400).json({
          error: `clips[${i}].${field} is required`,
          index: i,
        });
      }
    }
    const forward = c.forward !== false;
    const reversed = c.reversed === true;
    if (!forward && !reversed) {
      return res.status(400).json({
        error: `clips[${i}] must request at least one rendition (forward or reversed)`,
        index: i,
      });
    }
  }

  const started = Date.now();
  const perClip = new Array(clips.length);

  async function runLimited(items, limit, worker) {
    const queue = items.map((item, idx) => ({ item, idx }));
    const runners = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (queue.length) {
          const { item, idx } = queue.shift();
          try {
            perClip[idx] = { ok: true, ...(await worker(item, idx)) };
          } catch (e) {
            perClip[idx] = {
              ok: false,
              error: e.message,
              code: e.code ?? null,
            };
          }
        }
      }
    );
    await Promise.all(runners);
  }

  try {
      await runLimited(clips, 3, async (clip, idx) => {
          const {
            trackId, sourceSrc, name, artistId, position,
            startSec = 0, seconds = 10, label = null,
            album_name = null,
            released_year = null,              // ← NEW
            featured_artists = null,
            forward = true, reversed = false,
            source = 'music',
          } = clip;

          console.log(
            `  [batch ${idx + 1}/${clips.length}] ${name} (${position}) ` +
            `fwd=${forward} rev=${reversed}` +
            (album_name ? ` album="${album_name}"` : '') +
            (released_year ? ` year=${released_year}` : '')
          );

          const { slotId, out, errors } = await publishAndSaveSlot({
            trackId, sourceSrc, name, artistId, position,
            startSec, duration: seconds, forward, reversed, label,
            albumName: album_name,
            releasedYear: released_year,       // ← NEW
            featuredArtists: featured_artists,
            source,
            loggerPrefix: '    ',
          });

          return { slotId, out, errors };
        });

    // ── Flatten into a per-rendition result list ──────
    const results = [];
    for (let i = 0; i < perClip.length; i++) {
      const r = perClip[i];
      const c = clips[i];
      if (!r) {
        results.push({ ok: false, name: c.name, position: c.position, error: 'No result' });
        continue;
      }
      if (!r.ok) {
        results.push({
          ok: false, name: c.name, position: c.position,
          error: r.error, code: r.code ?? null,
        });
        continue;
      }

      if (r.out?.forward) {
        results.push({
          ok: true, name: c.name, position: c.position, rendition: 'forward',
          slotId: r.slotId, r2_key: r.out.forward.r2_key,
          size_bytes: r.out.forward.size_bytes,
        });
      }
      if (r.out?.reversed) {
        results.push({
          ok: true, name: c.name, position: c.position, rendition: 'reversed',
          slotId: r.slotId, r2_key: r.out.reversed.r2_key,
          size_bytes: r.out.reversed.size_bytes,
        });
      }
      for (const err of (r.errors ?? [])) {
        results.push({
          ok: false, name: c.name, position: c.position,
          rendition: err.rendition, error: err.error, code: err.code ?? null,
        });
      }
    }

    const succeeded = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    res.json({
      ok: failed === 0,
      total: results.length,
      succeeded,
      failed,
      elapsed: Date.now() - started,
      results,
    });
  } catch (e) {
    console.error('[publish-clips]', e);
    res.status(500).json({ error: e.message, perClip });
  }
});



// ═══════════════════════════════════════════════════════════
// POST /api/cloudflare/tracks/reverse-batch
// Batch-reverse every slot that has a forward clip but no reversed clip.
// Body: { limit?: number } — optional cap on this run.
// ═══════════════════════════════════════════════════════════
router.post('/tracks/reverse-batch', async (req, res) => {
  const limitRaw = req.body?.limit;
  const limit = Number.isInteger(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, MAX_REVERSE_BATCH)
    : null;

  // Query the Worker for slots with a forward clip and no reversed clip.
  // `has_reversed=0` is essential — without it, the Worker returns every
  // forward slot and we'd have to filter locally (and would break past
  // 20,000 rows). We still page through with `offset` as a safety net in
  // case the result set ever exceeds a single batch.
  const PAGE_SIZE = 20000;
  let missing = [];
  try {
    let offset = 0;
    while (true) {
      const data = await cloudflare.get(
        `/tracks?has_forward=1&has_reversed=0&limit=${PAGE_SIZE}&offset=${offset}`
      );
      const batch = data?.tracks ?? [];
      for (const t of batch) missing.push(t.id);
      if (batch.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
      // Hard stop: never page beyond MAX_REVERSE_BATCH rows in one run.
      if (missing.length >= MAX_REVERSE_BATCH) break;
    }
  } catch (e) {
    return res.status(502).json({ error: `Failed to list tracks: ${e.message}` });
  }

  if (missing.length === 0) {
    return res.status(200).json({ ok: true, count: 0, message: 'Nothing to reverse.' });
  }

  const ids = limit ? missing.slice(0, limit) : missing;

  try { mkdirSync(TMP_DIR, { recursive: true }); } catch { /* exists */ }
  const idsFile = join(TMP_DIR, `reverse-batch-${randomUUID()}.json`);
  try {
    writeFileSync(idsFile, JSON.stringify(ids), 'utf8');
  } catch (e) {
    return res.status(500).json({ error: `Failed to write ids file: ${e.message}` });
  }

  const job = createJob({ scope: 'reverse-batch', args: { total: ids.length, limit } });

  const scriptPath = existsSync(REVERSE_BATCH_SCRIPT) ? REVERSE_BATCH_SCRIPT : null;
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

  child.on('error', (e) => finishJob(job.id, { status: 'failed', error: e.message }));

  return res.status(201).json({ job: publicJob(job), count: ids.length });
});
// ─────────────────────────────────────────────────────────────
// POST /api/cloudflare/tracks/:id/reverse
// Reverses an existing forward clip and attaches it as the
// reversed rendition of the same slot.
//
// Body (all optional):
//   { replace: true }   — if the slot already has a reversed clip,
//                         replace it (the frontend confirms first).
// ─────────────────────────────────────────────────────────────
router.post('/tracks/:id/reverse', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }

    // ── Fetch the slot ─────────────────────────────────
    const { track } = await cloudflare.get(`/tracks/${id}`);
    if (!track) {
      return res.status(404).json({ error: `Track ${id} not found` });
    }
    if (!track.r2_key) {
      return res.status(400).json({
        error: 'Slot has no forward clip to reverse',
        code: 'NO_FORWARD',
      });
    }
    if (track.r2_reversed_key && !req.body?.replace) {
      return res.status(409).json({
        error: 'Slot already has a reversed clip. Pass { replace: true } to overwrite.',
        code: 'ALREADY_REVERSED',
      });
    }

    // ── Derive trackId + duration from the R2 key ──────
    // Key format: clips[/quran|/upload]/track-{id}-{position}-{N}s[-rev].mp3
    const m = track.r2_key.match(/track-([\w-]+)-([a-z]+)(?:-(\d+)s)?-(\d+)s(-rev)?\.mp3$/);
    if (!m) {
      return res.status(500).json({
        error: `Cannot parse r2_key: ${track.r2_key}`,
        code: 'BAD_KEY',
      });
    }
    const parsedTrackId  = m[1];
    const parsedPosition = m[2] || track.position;
    const parsedDuration = Number(m[4]);

    // Infer source from prefix
    const source = track.r2_key.startsWith('clips/quran/')  ? 'quran'
                 : track.r2_key.startsWith('clips/upload/') ? 'upload'
                 : 'music';

    // ── Produce the reversed clip ──────────────────────
    const result = await reverseExistingClip({
      trackId: parsedTrackId,
      forwardKey: track.r2_key,
      position: parsedPosition,
      durationSec: parsedDuration,
      startSec: 0,
      source,
      onProgress: (stage, data) =>
        console.log(`  [reverse ${id}] ${stage}`, data ?? ''),
    });

    // ── Save the new key on the row ────────────────────
    // Preserve every other field so PUT doesn't clobber them,
    // including album_name.
    const updated = await cloudflare.put(`/tracks/${id}`, {
      name: track.name,
      artist_id: track.artist_id,
      r2_key: track.r2_key,
      r2_reversed_key: result.r2_key,
      position: track.position,
      label: track.label ?? null,
      album_name: track.album_name ?? null,   
      featured_artists: track.featured_artists ?? null
    });

    res.json({
      ok: true,
      track: updated?.track ?? { ...track, r2_reversed_key: result.r2_key },
      reversed: result,
    });
  } catch (e) {
    console.error(`[cloudflare/tracks POST ${req.params.id}/reverse]`, e);
    res.status(e.status ?? 500).json({
      error: e.message,
      code: e.code ?? null,
    });
  }
});

// ═══════════════════════════════════════════════════════════
// LIST — read all slots (forward/reversed keys included)
// ═══════════════════════════════════════════════════════════

/** GET /api/cloudflare/tracks */
router.get('/tracks', async (req, res) => {
  try {
    const params = new URLSearchParams();
    // Forward every supported filter + pagination param.
    for (const key of [
      'artist_id', 'position', 'search', 'album_name',
      'has_forward', 'has_reversed',
      'limit', 'offset',
    ]) {
      if (req.query[key] != null && req.query[key] !== '') {
        params.set(key, req.query[key]);
      }
    }

    const qs = params.toString();
    const data = await cloudflare.get('/tracks' + (qs ? `?${qs}` : ''));
    // Pass the Worker's full response through — tracks, count, total,
    // limit, offset. Anything added to the Worker later is carried
    // automatically.
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/tracks]', e);
    res.status(502).json({ error: e.message });
  }
});


router.use(reverseBatchRouter);

export default router;