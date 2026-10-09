// server/routes/albums.js
import { Router } from 'express';
import { matb3aa } from '../../matb3aa.js';

const router = Router();

/**
 * GET /api/albums/:id
 *
 * Returns the album metadata + its full tracklist.
 *
 * matb3aa's `/albums/:id` endpoint returns the album object with a
 * `tracks` array nested inside it. There is no separate `/tracks`
 * sub-endpoint (that path returns HTML).
 */
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const data = await matb3aa.api(`/albums/${encodeURIComponent(id)}`);
    const album = data?.album;

    if (!album) {
      return res.status(404).json({
        error: `Album ${id} not found in matb3aa`,
        id,
      });
    }

    res.json({
      id,
      album: {
        id: album.id,
        name: album.name ?? album.title,
        image: album.image ?? null,
        release_date: album.release_date ?? null,
        artists: album.artists ?? [],
        genres: album.genres ?? [],
        tags: album.tags ?? [],
        tracks_count: album.tracks_count ?? 0,
        plays: album.plays ?? 0,
        views: album.views ?? 0,
      },
      tracks: album.tracks ?? [],
    });
  } catch (e) {
    console.error(`[/api/albums/${req.params.id}]`, e);
    res.status(500).json({ error: e.message });
  }
});

export default router;