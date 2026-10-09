// server/routes/matbaa-routes/artist-catalogue.js
import { Router } from 'express';
import { matb3aa } from '../../matb3aa.js';

const router = Router();

const ALBUM_FETCH_CONCURRENCY = 2;

async function runLimited(items, limit, worker) {
  const results = new Array(items.length);
  const queue = items.map((item, idx) => ({ item, idx }));

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (queue.length) {
        const { item, idx } = queue.shift();
        try {
          results[idx] = { ok: true, value: await worker(item, idx) };
        } catch (e) {
          results[idx] = { ok: false, error: e };
        }
      }
    }
  );
  await Promise.all(runners);
  return results;
}

/**
 * GET /api/artists/:slug/catalogue
 */
router.get('/:slug/catalogue', async (req, res) => {
  const t0 = Date.now();

  try {
    const slug = req.params.slug;

    // 1. Profile
    const profile = await matb3aa.api(`/artists/${encodeURIComponent(slug)}`);
    if (!profile?.artist?.id) {
      return res.status(404).json({ error: `Artist "${slug}" not found` });
    }

    const artistId = profile.artist.id;
    const artist = {
      id: artistId,
      name: profile.artist.name,
      wp_slug: profile.artist.wp_slug,
      image_small: profile.artist.image_small,
    };

    // 2. All tracks
    const allTracks = [];
    for (let page = 1; page <= 20; page++) {
      const j = await matb3aa.api(
        `/artists/${artistId}/tracks?perPage=100&page=${page}`
      );
      const items = j.pagination?.data || [];
      if (!items.length) break;
      allTracks.push(...items);
      if (!j.pagination?.next_page) break;
    }

    // 3. Album list
    const allAlbums = [];
    for (let page = 1; page <= 10; page++) {
      const j = await matb3aa.api(
        `/artists/${artistId}/albums?perPage=100&page=${page}`
      );
      const items = j.pagination?.data || [];
      if (!items.length) break;
      allAlbums.push(...items);
      if (!j.pagination?.next_page) break;
    }

    // 4. Fan out per-album — tracks live at `data.album.tracks`
    const albumResults = await runLimited(
      allAlbums,
      ALBUM_FETCH_CONCURRENCY,
      async (album) => {
        try {
          const data = await matb3aa.api(`/albums/${album.id}`);
          const tracks = data?.album?.tracks ?? [];
          console.log(`[catalogue] album ${album.id} → ${tracks.length} tracks`);
          return { album, tracks };
        } catch (e) {
          console.warn(`[catalogue] album ${album.id} failed:`, e.message);
          return { album, tracks: [], error: e.message };
        }
      }
    );

    // 5. Merge + dedupe
    const trackMap = new Map();

    for (const t of allTracks) {
      trackMap.set(t.id, {
        id: t.id,
        name: t.name,
        src: t.src,
        duration: t.duration,
        artists: t.artists ?? [],
        album_id: null,
        album_name: null,
        album_image: null,
      });
    }

    const albumList = [];
    for (const r of albumResults) {
      if (!r.ok) continue;
      const { album, tracks } = r.value;

      albumList.push({
        id: album.id,
        name: album.name,
        image: album.image,
        tracks_count: tracks.length,
      });

      for (const t of tracks) {
        if (trackMap.has(t.id)) {
          const entry = trackMap.get(t.id);
          entry.album_id = album.id;
          entry.album_name = album.name;
          entry.album_image = album.image;
        } else {
          trackMap.set(t.id, {
            id: t.id,
            name: t.name,
            src: t.src,
            duration: t.duration,
            artists: t.artists ?? [],
            album_id: album.id,
            album_name: album.name,
            album_image: album.image,
          });
        }
      }
    }

    const mergedTracks = [...trackMap.values()];
    const withAlbum = mergedTracks.filter(t => t.album_id != null).length;

    console.log(
      `[/api/artists/${slug}/catalogue] ${mergedTracks.length} tracks, ` +
      `${allAlbums.length} albums, ${withAlbum} with album — ${Date.now() - t0}ms`
    );

    res.json({
      artist,
      tracks: mergedTracks,
      albums: albumList,
      counts: {
        tracks: mergedTracks.length,
        albums: albumList.length,
        withAlbum,
      },
    });
  } catch (e) {
    console.error(`[/api/artists/:slug/catalogue]`, e);
    res.status(500).json({ error: e.message });
  }
});

export default router;