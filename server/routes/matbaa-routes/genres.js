import { Router } from 'express';
import { matb3aa } from '../../matb3aa.js';

const router = Router();

// ─────────────────────────────────────────────────────
// GET /api/genres
// Returns all genres from matb3aa.
// ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const genres = await matb3aa.apiAll('/genres?orderBy=id&orderDir=asc');
    res.json({
      count: genres.length,
      genres,
    });
  } catch (e) {
    console.error('[/api/genres]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/genres/:slug/artists
// Returns artists that have tracks in the given genre.
//
// Strategy: matb3aa has no direct "artists by genre" endpoint,
// so we pull tracks tagged with the genre and collect unique artists.
// ─────────────────────────────────────────────────────
router.get('/:slug/artists', async (req, res) => {
  try {
    const slug = req.params.slug;
    const maxPages = Number(req.query.maxPages) || 3;   // tune via query

    console.log(`[/api/genres/${slug}/artists] fetching...`);

    const tracks = await matb3aa.apiAll(
      `/tags/${encodeURIComponent(slug)}/tracks`,
      { perPage: 100, maxPages }
    );

    console.log(`[/api/genres/${slug}/artists] got ${tracks.length} tracks`);

    // Deduplicate artists across all tracks
    const seen = new Map();
    for (const t of tracks) {
      for (const a of t.artists || []) {
        if (!seen.has(a.id)) {
          seen.set(a.id, {
            id: a.id,
            name: a.name,
            wp_slug: a.wp_slug,
            image_small: a.image_small,
            verified: a.verified,
          });
        }
      }
    }

    const artists = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    res.json({
      genre: slug,
      trackCount: tracks.length,
      artistCount: artists.length,
      artists,
    });
  } catch (e) {
    console.error(`[/api/genres/${req.params.slug}/artists]`, e);
    res.status(500).json({ error: e.message });
  }
});

export default router;