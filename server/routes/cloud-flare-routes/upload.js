// server/routes/cloud-flare-routes/upload.js
import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fsp from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { publishClip } from '../../lib/publish-clip.js';
import { cloudflare } from './cloudflare.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_TMP = join(__dirname, '..', '..', 'tmp-preview-test');

await fsp.mkdir(UPLOAD_TMP, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_TMP),
  filename: (req, file, cb) => {
    const ext = (file.originalname.match(/\.(mp3|wav|m4a|ogg|flac)$/i)?.[0]) ?? '.mp3';
    cb(null, `upload-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024, files: 3000 ,  },
});

const CONCURRENCY = 4;

/**
 * Publish the requested renditions for ONE slot, then save ONE /tracks row.
 *
 * On 409 (slot already exists), fetch the existing row and PUT to merge the
 * new keys into it. Never creates a duplicate row.
 */
async function publishAndSaveSlot({
  trackId, sourceSrc, name, artistId, position,
  duration, forward, reversed, label, source, loggerPrefix = '  ',
}) {
  const out = { forward: null, reversed: null };
  const errors = [];

  if (forward) {
    try {
      out.forward = await publishClip({
        trackId, sourceSrc, name, artistId, position,
        startSec: 0, seconds: duration, label, source, reversed: false,
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
        startSec: 0, seconds: duration, label, source, reversed: true,
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
    // Both renditions failed or were disabled — nothing to save.
    return { slotId: null, out, errors };
  }

  // ── Try to create the slot ────────────────────────────
  let slotId = null;
  try {
    const saved = await cloudflare.post('/tracks', {
      name,
      artist_id: artistId,
      r2_key: r2Key,
      r2_reversed_key: r2ReversedKey,
      position,
      label,
    });
    slotId = saved?.track?.id ?? null;
  } catch (e) {
    // 409 = slot already exists → merge into it
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

/**
 * POST /api/cloudflare/tracks/publish-upload
 * multipart/form-data:
 *   files      (binary[], required — 1..50 files)
 *   artistId   (int, optional)
 *   newArtist  (JSON string, optional — { id, name, genre_ids, image })
 *   positions  (JSON array — [{ position, enabled, duration, forward, reversed }, ...])
 *   label      (string, optional)
 */
router.post(
  '/tracks/publish-upload',
  (req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () =>
      console.log(`[publish-upload] ⏱ total ${Date.now() - t0}ms`)
    );
    next();
  },
  upload.array('files', 3000),
  async (req, res) => {
    const tStart = Date.now();
    const filesOnDisk = req.files ?? [];
    const toDelete = filesOnDisk.map(f => f.path);

    try {
      if (filesOnDisk.length === 0) {
        return res.status(400).json({ error: 'at least one file is required' });
      }

      // ── Artist resolution ─────────────────────────────
      let artistId = req.body.artistId ? Number(req.body.artistId) : null;
      const label = req.body.label ?? null;

      if (!artistId && req.body.newArtist) {
        let payload;
        try { payload = JSON.parse(req.body.newArtist); }
        catch { return res.status(400).json({ error: 'newArtist must be valid JSON' }); }

        const id = Number(payload.id);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ error: 'newArtist.id must be a positive integer' });
        }
        if (!payload.name?.trim()) {
          return res.status(400).json({ error: 'newArtist.name is required' });
        }

        const created = await cloudflare.post('/artists', {
          id,
          name: payload.name.trim(),
          genre_ids: Array.isArray(payload.genre_ids) ? payload.genre_ids : [],
          image: payload.image ?? null,
          is_customized: 1,
        });
        artistId = created?.artist?.id ?? created?.id;
        if (!artistId) {
          return res.status(502).json({ error: 'Artist created but no id returned' });
        }
      }

      if (!artistId) {
        return res.status(400).json({ error: 'artistId or newArtist is required' });
      }

      // ── Position configs ──────────────────────────────
      let positionConfigs = [
        { position: 'start', enabled: true, duration: 10, forward: true, reversed: false },
      ];
      try {
        if (req.body.positions) {
          const parsed = JSON.parse(req.body.positions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            positionConfigs = parsed.map(p => ({
              position: typeof p === 'string' ? p : (p.position ?? 'start'),
              enabled: p.enabled !== false,
              duration: Number(p.duration ?? 10),
              forward: p.forward !== false,
              reversed: p.reversed === true,
            }));
          }
        }
      } catch { /* keep default */ }

      const activePositions = positionConfigs.filter(p => p.enabled);
      if (activePositions.length === 0) {
        return res.status(400).json({ error: 'at least one position must be enabled' });
      }

      // Skip configs where neither rendition is requested
      const usablePositions = activePositions.filter(p => p.forward || p.reversed);
      if (usablePositions.length === 0) {
        return res.status(400).json({ error: 'no renditions requested' });
      }

      const baseTrackId = 9000000 + (Date.now() % 1000000);
      const results = [];

      // ── Build jobs: one per (file, position) ──────────
      const jobs = [];
      for (let i = 0; i < filesOnDisk.length; i++) {
        const f = filesOnDisk[i];
        const trackId = baseTrackId + i;
        const baseName =
          f.originalname.replace(/\.[^.]+$/, '').trim() || `Untitled ${i + 1}`;
        for (const cfg of usablePositions) {
          jobs.push({ f, trackId, baseName, cfg });
        }
      }

      // ── Concurrency-limited runner ────────────────────
      const resultsByIndex = new Array(jobs.length);
      async function runLimited(items, limit, worker) {
        const queue = items.map((item, idx) => ({ item, idx }));
        const runners = Array.from(
          { length: Math.min(limit, items.length) },
          async () => {
            while (queue.length) {
              const { item, idx } = queue.shift();
              try {
                resultsByIndex[idx] = await worker(item, idx);
              } catch (e) {
                resultsByIndex[idx] = { error: e.message };
              }
            }
          }
        );
        await Promise.all(runners);
      }

      await runLimited(jobs, CONCURRENCY, async (job, idx) => {
        const { f, trackId, baseName, cfg } = job;
        console.log(
          `  [slot ${idx + 1}/${jobs.length}] ${baseName} (${cfg.position}) ` +
          `fwd=${cfg.forward} rev=${cfg.reversed}`
        );

        const { slotId, out, errors } = await publishAndSaveSlot({
          trackId,
          sourceSrc: f.path,
          name: baseName,
          artistId,
          position: cfg.position,
          duration: cfg.duration,
          forward: cfg.forward,
          reversed: cfg.reversed,
          label,
          source: 'upload',
          loggerPrefix: '    ',
        });

        return { name: baseName, position: cfg.position, slotId, out, errors };
      });

      // ── Flatten into a per-rendition result list ──────
      for (const r of resultsByIndex) {
        if (!r || r.error) {
          results.push({ ok: false, error: r?.error ?? 'Unknown error' });
          continue;
        }
        const { name, position, slotId, out, errors } = r;

        if (out.forward) {
          results.push({
            ok: true, name, position, rendition: 'forward',
            slotId, r2_key: out.forward.r2_key,
            size_bytes: out.forward.size_bytes,
          });
        }
        if (out.reversed) {
          results.push({
            ok: true, name, position, rendition: 'reversed',
            slotId, r2_key: out.reversed.r2_key,
            size_bytes: out.reversed.size_bytes,
          });
        }
        for (const err of errors) {
          results.push({
            ok: false, name, position,
            rendition: err.rendition,
            error: err.error, code: err.code ?? null,
          });
        }
      }

      const succeeded = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok).length;

      console.log(
        `[publish-upload] published ${succeeded}/${results.length} renditions in ` +
        `${Date.now() - tStart}ms`
      );

      res.json({
        ok: failed === 0,
        artistId,
        total: results.length,
        succeeded,
        failed,
        elapsed: Date.now() - tStart,
        results,
      });
    } catch (e) {
      console.error('[publish-upload]', e);
      res.status(e.status ?? 500).json({ error: e.message, code: e.code ?? null });
    } finally {
      await Promise.all(toDelete.map(p => fsp.unlink(p).catch(() => {})));
    }
  }
);

export default router;