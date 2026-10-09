// server/routes/cloud-flare-routes/artists.js
import { Router } from 'express';
import { cloudflare } from './cloudflare.js';

const router = Router();

/* ═══════════════════════════════════════════════════════════
   GET /api/cloudflare/artists?genre_id=...&search=...&source=...
   ═══════════════════════════════════════════════════════════ */

router.get('/artists', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.genre_id) params.set('genre_id', req.query.genre_id);
    if (req.query.search)   params.set('search',   req.query.search);
    if (req.query.source)   params.set('source',   req.query.source);
    if (req.query.limit)    params.set('limit',    req.query.limit);
    if (req.query.offset)   params.set('offset',   req.query.offset);

    const qs = params.toString();
    const data = await cloudflare.get('/artists' + (qs ? `?${qs}` : ''));
    res.json({
      artists: data?.artists ?? [],
      count: data?.count ?? 0,
      total: data?.total ?? data?.count ?? 0,
    });
  } catch (e) {
    console.error('[cloudflare/artists]', e);
    res.status(502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   GET /api/cloudflare/artists/:id
   ═══════════════════════════════════════════════════════════ */

router.get('/artists/:id', async (req, res) => {
  try {
    const data = await cloudflare.get(`/artists/${req.params.id}`);
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/artists/${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/cloudflare/artists
   ═══════════════════════════════════════════════════════════ */

router.post('/artists', async (req, res) => {
  try {
    const { id, name, genre_ids, image, tracks_count, is_customized, source } =
      req.body ?? {};

    if (!id || !name || !Array.isArray(genre_ids)) {
      return res.status(400).json({
        error: 'id, name, and genre_ids (array) are required',
      });
    }

    try {
      const result = await cloudflare.post('/artists', {
        id,
        name,
        genre_ids,
        image: image ?? null,
        tracks_count: tracks_count ?? 0,
        is_customized: is_customized ? 1 : 0,
        source: source ?? 'matb3aa',
      });
      return res.status(201).json(result);
    } catch (e) {
      if (e.status === 409) {
        const result = await cloudflare.put(`/artists/${id}`, {
          name,
          genre_ids,
          image: image ?? null,
          source: source ?? undefined,
        });
        return res.json({ ...result, upserted: true });
      }
      throw e;
    }
  } catch (e) {
    console.error('[cloudflare/artists POST]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   PUT /api/cloudflare/artists/:id
   ═══════════════════════════════════════════════════════════ */

router.put('/artists/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, genre_ids, image, source } = req.body ?? {};
    if (!name || !Array.isArray(genre_ids)) {
      return res.status(400).json({ error: 'name and genre_ids (array) are required' });
    }

    const body = { name, genre_ids, image: image ?? null };
    if (source) body.source = source;

    const result = await cloudflare.put(`/artists/${id}`, body);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/artists PUT ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   DELETE /api/cloudflare/artists/:id
   ═══════════════════════════════════════════════════════════ */

router.delete('/artists/:id', async (req, res) => {
  try {
    const result = await cloudflare.delete(`/artists/${req.params.id}`);
    res.json(result);
  } catch (e) {
    console.error(`[cloudflare/artists DELETE ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   PATCH /api/cloudflare/artists/:id/tracks_count
   ═══════════════════════════════════════════════════════════ */

router.patch('/artists/:id/tracks_count', async (req, res) => {
  try {
    const { delta } = req.body ?? {};
    if (!Number.isInteger(delta)) {
      return res.status(400).json({ error: 'delta must be an integer' });
    }

    const cfRes = await fetch(
      `${process.env.CF_API_BASE}/artists/${req.params.id}/tracks_count`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      }
    );
    const data = await cfRes.json();
    res.status(cfRes.status).json(data);
  } catch (e) {
    console.error(`[cloudflare/artists PATCH tracks_count ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

export default router;