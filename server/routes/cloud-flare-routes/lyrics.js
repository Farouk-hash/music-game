import { Router } from 'express';
import { cloudflare } from './cloudflare.js';

const router = Router();

/* ═══════════════════════════════════════════════════════════
   LIST — GET /api/cloudflare/lyrics
   Query: artist_id, search, has_lyrics, limit, offset
   ═══════════════════════════════════════════════════════════ */

router.get('/lyrics', async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.artist_id)  params.set('artist_id',  req.query.artist_id);
    if (req.query.search)     params.set('search',     req.query.search);
    if (req.query.has_lyrics !== undefined) params.set('has_lyrics', req.query.has_lyrics);
    if (req.query.limit)      params.set('limit',      req.query.limit);
    if (req.query.offset)     params.set('offset',     req.query.offset);

    const qs = params.toString();
    const data = await cloudflare.get('/lyrics' + (qs ? `?${qs}` : ''));
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/lyrics]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   STATS — GET /api/cloudflare/lyrics/stats
   ═══════════════════════════════════════════════════════════ */

router.get('/lyrics/stats', async (req, res) => {
  try {
    const data = await cloudflare.get('/lyrics/stats');
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/lyrics/stats]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   BY-TRACK — GET /api/cloudflare/lyrics/by-track
   Query: artist_id, track_name
   ═══════════════════════════════════════════════════════════ */

router.get('/lyrics/by-track', async (req, res) => {
  try {
    const { artist_id, track_name } = req.query;
    if (!artist_id || !track_name) {
      return res.status(400).json({ error: 'artist_id and track_name are required' });
    }
    const params = new URLSearchParams();
    params.set('artist_id',  artist_id);
    params.set('track_name', track_name);
    const data = await cloudflare.get(`/lyrics/by-track?${params.toString()}`);
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/lyrics/by-track]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   BULK — POST /api/cloudflare/lyrics/bulk
   Body: { items: [{ artist_id, track_name, lyrics }, ...] }
   MUST be registered before /lyrics/:id
   ═══════════════════════════════════════════════════════════ */

router.post('/lyrics/bulk', async (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }
    const data = await cloudflare.post('/lyrics/bulk', { items });
    res.json(data);
  } catch (e) {
    console.error('[cloudflare/lyrics/bulk]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   CREATE — POST /api/cloudflare/lyrics
   Body: { artist_id, track_name, lyrics? }
   ═══════════════════════════════════════════════════════════ */

router.post('/lyrics', async (req, res) => {
  try {
    const { artist_id, track_name, lyrics } = req.body ?? {};
    if (!artist_id)  return res.status(400).json({ error: 'artist_id is required' });
    if (!track_name) return res.status(400).json({ error: 'track_name is required' });

    const data = await cloudflare.post('/lyrics', {
      artist_id:  Number(artist_id),
      track_name: String(track_name),
      lyrics:     lyrics == null ? null : String(lyrics),
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('[cloudflare/lyrics POST]', e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   GET ONE — GET /api/cloudflare/lyrics/:id
   ═══════════════════════════════════════════════════════════ */

router.get('/lyrics/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const data = await cloudflare.get(`/lyrics/${id}`);
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/lyrics GET ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   UPDATE — PUT /api/cloudflare/lyrics/:id
   Body: { lyrics }
   ═══════════════════════════════════════════════════════════ */

router.put('/lyrics/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const { lyrics } = req.body ?? {};
    const data = await cloudflare.put(`/lyrics/${id}`, {
      lyrics: lyrics == null ? null : String(lyrics),
    });
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/lyrics PUT ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   DELETE — DELETE /api/cloudflare/lyrics/:id
   ═══════════════════════════════════════════════════════════ */

router.delete('/lyrics/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }
    const data = await cloudflare.delete(`/lyrics/${id}`);
    res.json(data);
  } catch (e) {
    console.error(`[cloudflare/lyrics DELETE ${req.params.id}]`, e);
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

export default router;