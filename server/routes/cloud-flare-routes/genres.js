import { Router } from 'express';
import { cloudflare } from './cloudflare.js';

const router = Router();

/** GET /api/cloudflare/ping */
router.get('/ping', async (req, res) => {
  try {
    const started = Date.now();
    const data = await cloudflare.get('/genres');
    const elapsed = Date.now() - started;
    res.json({
      ok: true,
      latencyMs: elapsed,
      genreCount: data?.count ?? 0,
      sample: (data?.genres ?? []).slice(0, 3),
    });
  } catch (e) {
    console.error('[cloudflare/ping]', e);
    res.status(502).json({ ok: false, error: e.message, upstreamStatus: e.status ?? null });
  }
});

/** GET /api/cloudflare/genres */
router.get('/genres', async (req, res) => {
  try {
    const data = await cloudflare.get('/genres');
    res.json({ genres: data?.genres ?? [], count: data?.count ?? 0 });
  } catch (e) {
    console.error('[cloudflare/genres]', e);
    res.status(502).json({ error: e.message });
  }
});

/** POST /api/cloudflare/genres */
router.post('/genres', async (req, res) => {
  try {
    const { id, name, display_name, image, is_customized } = req.body ?? {};
    if (!id || !name || !display_name) {
      return res.status(400).json({ error: 'id, name, and display_name are required' });
    }

    try {
      const result = await cloudflare.post('/genres', {
        id, name, display_name,
        image: image ?? null,
        is_customized: is_customized ? 1 : 0,
      });
      return res.status(201).json(result);
    } catch (e) {
      if (e.status === 409) {
        // Upsert: it already exists → PUT (which also marks as customized)
        const result = await cloudflare.put(`/genres/${id}`, {
          name, display_name, image: image ?? null,
        });
        return res.json({ ...result, upserted: true });
      }
      throw e;
    }
  } catch (e) {
    console.error('[cloudflare/genres POST]', e);
    res.status(e.status ?? 502).json({ error: e.message, upstreamStatus: e.status ?? null });
  }
});

/** PUT /api/cloudflare/genres/:id */
router.put('/genres/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, display_name, image } = req.body ?? {};
    if (!name || !display_name) {
      return res.status(400).json({ error: 'name and display_name are required' });
    }
    const result = await cloudflare.put(`/genres/${id}`, {
      name, display_name, image: image ?? null,
    });
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/genres PUT ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message, upstreamStatus: e.status ?? null });
  }
});

/** DELETE /api/cloudflare/genres/:id */
router.delete('/genres/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await cloudflare.delete(`/genres/${id}`);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/genres DELETE ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message, upstreamStatus: e.status ?? null });
  }
});

export default router;