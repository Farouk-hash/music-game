import { Router } from 'express';
import { matb3aa } from '../../matb3aa.js';

const router = Router();



/**
 * GET /api/artists
 *
 * Returns the "latest singers" list.
 *
 * matb3aa's frontend page at /singers is a thin wrapper over the
 * artists endpoint sorted by creation date, newest first. There is
 * no dedicated /singers API endpoint — the frontend page uses
 * /api/v1/artists?orderBy=created_at&orderDir=desc under the hood.
 *
 * Query params:
 *   ?page=1        page number (default 1)
 *   ?perPage=100   items per page (default 100, max 200)
 *   ?orderBy=...   created_at | name | plays | views  (default created_at)
 *   ?orderDir=...  asc | desc                          (default desc)
 */
router.get('/', async (req, res) => {
  try {
    const page      = Math.max(1, Number(req.query.page) || 1);
    const perPage   = Math.min(200, Math.max(1, Number(req.query.perPage) || 100));
    const orderBy   = ['created_at', 'name', 'plays', 'views'].includes(req.query.orderBy)
      ? req.query.orderBy
      : 'created_at';
    const orderDir  = req.query.orderDir === 'asc' ? 'asc' : 'desc';
    const withTotal = req.query.withTotal === '1';

    const path =
      `/artists?perPage=${perPage}&page=${page}` +
      `&orderBy=${orderBy}&orderDir=${orderDir}`;

    const data = await matb3aa.api(path);

    // ── Build the response object FIRST ─────────────────────
    const response = {
      pagination: data.pagination,
      artists: data.pagination?.data ?? [],
    };

    // ── Then conditionally add the total ────────────────────
    if (withTotal) {
      const big = await matb3aa.api(
        `/artists?perPage=999999&page=1&orderBy=${orderBy}&orderDir=${orderDir}`
      );
      const total = big.pagination?.data?.length ?? 0;
      response.total = total;
      response.totalPages = Math.max(1, Math.ceil(total / perPage));
    }

    res.json(response);
  } catch (e) {
    console.error('[/api/artists]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/artists/:slug
// Full artist profile + top tracks + all tracks + all albums.
//
// Query params:
//   ?tracksLimit=50    max tracks to return (default 100, max 500)
//   ?albumsLimit=50    max albums to return (default 50)
//   ?include=tracks,albums,profile   (default all)
// ─────────────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const tracksLimit = Math.min(Number(req.query.tracksLimit) || 100, 500);
    const albumsLimit = Math.min(Number(req.query.albumsLimit) || 50, 200);
    const include = (req.query.include || 'profile,tracks,albums').split(',');

    console.log(`[/api/artists/${slug}] include=${include.join('|')} tracksLimit=${tracksLimit}`);

    // 1. Fetch the artist profile (includes artist, top_tracks, most_played, albums, singles_count)
    const profile = await matb3aa.api(`/artists/${encodeURIComponent(slug)}`);

    if (!profile?.artist) {
      return res.status(404).json({ error: `Artist "${slug}" not found` });
    }

    const artistId = profile.artist.id;
    const response = {
      artist: {
        id: profile.artist.id,
        name: profile.artist.name,
        wp_slug: profile.artist.wp_slug,
        image_small: profile.artist.image_small,
        verified: profile.artist.verified,
        views: profile.artist.views,
        plays: profile.artist.plays,
        genres: profile.artist.genres || [],
        created_at: profile.artist.created_at,
      },
      singlesCount: profile.singles_count ?? null,
      topTracks: profile.top_tracks || [],
      mostPlayed: profile.most_played || [],
    };

    // 2. All tracks (paginated via apiAll)
    if (include.includes('tracks')) {
      const allTracks = [];
      // Fetch pages until we hit tracksLimit
      for (let page = 1; page <= 10 && allTracks.length < tracksLimit; page++) {
        const j = await matb3aa.api(
          `/artists/${artistId}/tracks?perPage=100&page=${page}`
        );
        const items = j.pagination?.data || [];
        if (!items.length) break;
        allTracks.push(...items);
        if (!j.pagination?.next_page) break;
      }
      response.tracks = allTracks.slice(0, tracksLimit);
      response.tracksTotal = allTracks.length;
    }

    // 3. All albums
    if (include.includes('albums')) {
      const allAlbums = [];
      for (let page = 1; page <= 5 && allAlbums.length < albumsLimit; page++) {
        const j = await matb3aa.api(
          `/artists/${artistId}/albums?perPage=100&page=${page}`
        );
        const items = j.pagination?.data || [];
        if (!items.length) break;
        allAlbums.push(...items);
        if (!j.pagination?.next_page) break;
      }
      response.albums = allAlbums.slice(0, albumsLimit);
      response.albumsTotal = allAlbums.length;
    }

    res.json(response);
  } catch (e) {
    console.error(`[/api/artists/${req.params.slug}]`, e);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/artists/:slug/tracks
// Paginated track list only (lighter response than the full detail)
// ─────────────────────────────────────────────────────
router.get('/:slug/tracks', async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(Number(req.query.perPage) || 50, 200);

    // Resolve slug → id
    const profile = await matb3aa.api(`/artists/${encodeURIComponent(slug)}`);
    if (!profile?.artist?.id) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const j = await matb3aa.api(
      `/artists/${profile.artist.id}/tracks?perPage=${perPage}&page=${page}`
    );

    res.json({
      artist: {
        id: profile.artist.id,
        name: profile.artist.name,
        wp_slug: profile.artist.wp_slug,
      },
      pagination: j.pagination,
      tracks: j.pagination?.data || [],
    });
  } catch (e) {
    console.error('[/api/artists/:slug/tracks]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────
// GET /api/artists/:slug/albums
// ─────────────────────────────────────────────────────
router.get('/:slug/albums', async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(Number(req.query.perPage) || 50, 200);

    const profile = await matb3aa.api(`/artists/${encodeURIComponent(slug)}`);
    if (!profile?.artist?.id) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const j = await matb3aa.api(
      `/artists/${profile.artist.id}/albums?perPage=${perPage}&page=${page}`
    );

    res.json({
      artist: {
        id: profile.artist.id,
        name: profile.artist.name,
        wp_slug: profile.artist.wp_slug,
      },
      pagination: j.pagination,
      albums: j.pagination?.data || [],
    });
  } catch (e) {
    console.error('[/api/artists/:slug/albums]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;