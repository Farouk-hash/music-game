// server/routes/matbaa-routes/quran.js
import { Router } from 'express';
import {
  getReciters,
  getReciter,
  reciterToCard,
  reciterToDetail,
} from '../../mp3quran.js';

const router = Router();

/**
 * GET /api/quran/reciters
 * List all reciters. Supports ?search= for name filtering.
 */
router.get('/reciters', async (req, res) => {
  try {
    const reciters = await getReciters();
    let cards = reciters.map(reciterToCard);

    const search = (req.query.search || '').trim();
    if (search) {
      const q = search.toLowerCase();
      cards = cards.filter(c => c.name.toLowerCase().includes(q));
    }

    res.json({
      reciters: cards,
      count: cards.length,
    });
  } catch (e) {
    console.error('[/api/quran/reciters]', e);
    res.status(502).json({ error: e.message });
  }
});

/**
 * GET /api/quran/reciters/:id
 * Full detail for one reciter — meta + moshafs + surahs.
 */
router.get('/reciters/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id must be an integer' });
    }

    const reciter = await getReciter(id);
    if (!reciter) {
      return res.status(404).json({ error: `Reciter ${id} not found` });
    }

    res.json(reciterToDetail(reciter));
  } catch (e) {
    console.error(`[/api/quran/reciters/${req.params.id}]`, e);
    res.status(502).json({ error: e.message });
  }
});

export default router;