// server/routes/cloud-flare-routes/instruments_remote.js
import { Router } from 'express';
import { cloudflare } from './cloudflare.js';

const router = Router();

/* GET /api/cloudflare/remote/instruments */
router.get('/remote/instruments', async (req, res) => {
  try {
    const params = new URLSearchParams();
    for (const key of ['artist_id', 'position', 'search', 'limit', 'offset']) {
      if (req.query[key] != null && req.query[key] !== '') {
        params.set(key, req.query[key]);
      }
    }
    const qs = params.toString();
    const data = await cloudflare.get('/instruments' + (qs ? `?${qs}` : ''));
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/instruments]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* POST /api/cloudflare/remote/instruments/bulk */
router.post('/remote/instruments/bulk', async (req, res) => {
  try {
    const result = await cloudflare.post('/instruments/bulk', req.body ?? {});
    res.json(result);
  } catch (e) {
    console.error('[cloudflare/instruments/bulk]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* POST /api/cloudflare/remote/instruments/check-duplicates */
router.post('/remote/instruments/check-duplicates', async (req, res) => {
  try {
    const result = await cloudflare.post('/instruments/check-duplicates', req.body ?? {});
    res.json(result);
  } catch (e) {
    console.error('[cloudflare/instruments/check-duplicates]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* DELETE /api/cloudflare/remote/instruments/artist/:artistId */
router.delete('/remote/instruments/artist/:artistId', async (req, res) => {
  try {
    const result = await cloudflare.delete(`/instruments/artist/${req.params.artistId}`);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/instruments/artist/${req.params.artistId}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* DELETE /api/cloudflare/remote/instruments/:id */
router.delete('/remote/instruments/:id', async (req, res) => {
  try {
    const result = await cloudflare.delete(`/instruments/${req.params.id}`);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/instruments/${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});


/* GET /api/cloudflare/remote/instrumentals/serve?key=… */
router.get('/remote/instrumentals/serve', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'key query param required' });

    const url = `${process.env.CF_API_BASE}/instrumentals/serve?key=${encodeURIComponent(key)}`;
    const cfRes = await fetch(url);
    if (!cfRes.ok) {
      const text = await cfRes.text().catch(() => '');
      return res.status(cfRes.status).json({ error: text.slice(0, 200) });
    }

    res.setHeader('Content-Type', cfRes.headers.get('content-type') ?? 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (cfRes.headers.get('content-length')) {
      res.setHeader('Content-Length', cfRes.headers.get('content-length'));
    }

    // Stream the response body through
    const reader = cfRes.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    };
    await pump();
  } catch (e) {
    console.error('[cloudflare/instrumentals/serve]', e);
    res.status(502).json({ error: e.message });
  }
});

export default router;