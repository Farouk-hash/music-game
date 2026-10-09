import { Router } from 'express';
import { matb3aa } from '../../matb3aa.js';

const router = Router();

/**
 * GET /api/search?q={term}&type=artists|tracks|albums|all
 *
 * Proxies matb3aa's /search?query= endpoint and returns a normalized shape.
 *
 * Query params:
 *   ?q=عمرو              (required) the search term
 *   ?type=artists        which result set to return
 *                        (artists | tracks | albums | all, default artists)
 */
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const type = ['artists', 'tracks', 'albums', 'all'].includes(req.query.type)
      ? req.query.type
      : 'artists';

    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter "q"' });
    }

    // Call matb3aa's search endpoint
    const data = await matb3aa.api(`/search?query=${encodeURIComponent(q)}`);

    // The response nests results under `results.{artists,tracks,albums}.data`
    const results = data?.results ?? {};

    if (type === 'all') {
      return res.json({
        query: q,
        artists: results.artists?.data ?? [],
        tracks: results.tracks?.data ?? [],
        albums: results.albums?.data ?? [],
      });
    }

    // Return one bucket, shaped like our other endpoints
    const bucket = results[type] ?? { data: [], pagination: null };

    res.json({
      query: q,
      type,
      pagination: bucket.pagination ?? null,
      [type]: bucket.data ?? [],
    });
  } catch (e) {
    console.error('[/api/search]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;