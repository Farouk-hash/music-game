import { Router } from 'express';
import { cloudflare } from './cloudflare.js';

const router = Router();

/* ═══════════════════════════════════════════════════════════
   LIST — GET /api/cloudflare/album-years
   Query: artist_id, year, search, limit, offset
   ═══════════════════════════════════════════════════════════ */

router.get('/album-years', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.artist_id) params.set('artist_id', req.query.artist_id);
    if (req.query.year)      params.set('year',      req.query.year);
    if (req.query.search)    params.set('search',    req.query.search);
    if (req.query.limit)     params.set('limit',     req.query.limit);
    if (req.query.offset)    params.set('offset',    req.query.offset);

    const qs = params.toString();
    const data = await cloudflare.get('/album-years' + (qs ? `?${qs}` : ''));
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/album-years]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   STATS — GET /api/cloudflare/album-years/stats
   ═══════════════════════════════════════════════════════════ */

router.get('/album-years/stats', async (req, res) => {
  try {
    const data = await cloudflare.get('/album-years/stats');
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/album-years/stats]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   BY-ARTIST — GET /api/cloudflare/album-years/by-artist
   Query: artist_id
   ═══════════════════════════════════════════════════════════ */

router.get('/album-years/by-artist', async (req, res) => {
  try {
    const { artist_id } = req.query;
    if (!artist_id) {
      return res.status(400).json({ error: 'artist_id is required' });
    }
    const params = new URLSearchParams();
    params.set('artist_id', artist_id);
    const data = await cloudflare.get(`/album-years/by-artist?${params.toString()}`);
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/album-years/by-artist]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   BULK — POST /api/cloudflare/album-years/bulk
   Body: { items: [{ artist_id, album_name, released_year }, ...] }
   MUST be registered before /album-years/:id
   ═══════════════════════════════════════════════════════════ */

router.post('/album-years/bulk', async (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    const data = await cloudflare.post('/album-years/bulk', { items });
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/album-years/bulk]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   CREATE — POST /api/cloudflare/album-years
   Body: { artist_id, album_name, released_year }
   ═══════════════════════════════════════════════════════════ */

router.post('/album-years', async (req, res) => {
  try {
    const { artist_id, album_name, released_year } = req.body ?? {};
    if (!artist_id)     return res.status(400).json({ error: 'artist_id is required' });
    if (!album_name)    return res.status(400).json({ error: 'album_name is required' });
    if (released_year == null) return res.status(400).json({ error: 'released_year is required' });

    const data = await cloudflare.post('/album-years', {
      artist_id:     Number(artist_id),
      album_name:    String(album_name),
      released_year: Number(released_year),
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('[cloudflare/album-years POST]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   GET ONE — GET /api/cloudflare/album-years/:id
   ═══════════════════════════════════════════════════════════ */

router.get('/album-years/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const data = await cloudflare.get(`/album-years/${id}`);
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/album-years GET ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   UPDATE — PUT /api/cloudflare/album-years/:id
   Body: { album_name?, released_year? }
   ═══════════════════════════════════════════════════════════ */

router.put('/album-years/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }

    const body = {};
    if (req.body?.album_name != null)    body.album_name = String(req.body.album_name);
    if (req.body?.released_year != null) body.released_year = Number(req.body.released_year);

    const data = await cloudflare.put(`/album-years/${id}`, body);
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/album-years PUT ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   DELETE — DELETE /api/cloudflare/album-years/:id
   ═══════════════════════════════════════════════════════════ */

router.delete('/album-years/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const data = await cloudflare.delete(`/album-years/${id}`);
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/album-years DELETE ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

export default router;