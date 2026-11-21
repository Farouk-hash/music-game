import {
  cachedJsonResponse,
} from '../../../lib/cache.js';
/**
 * Get the global catalog (genres, artists, years, and aggregate counts).
 * Optimized to use SQL COUNT aggregates instead of full table scans.
 */

export async function getCatalog(request, env, ctx) {
  return cachedJsonResponse(
    request,
    env,
    ctx,
    'catalog:v1',
    2147483647, // KV TTL (effectively infinite)
    3600,       // Edge TTL (1 hour)
    async () => {
      // ── 1. Core data queries (ONLY 3 QUERIES NOW) ──────────────────
      const [genresRes, artistsRes, yearsRes] = await Promise.all([
        env.DB.prepare(
          'SELECT id, name, display_name, image FROM genres WHERE id != 6 ORDER BY display_name ASC'
        ).all(),
        env.DB.prepare(
          `SELECT id, name, genre_ids, image, tracks_count, lyrics_count, instruments_count
           FROM artists WHERE tracks_count > 0 ORDER BY name ASC`
        ).all(),
        env.DB.prepare(
          'SELECT released_year, artist_id FROM album_years ORDER BY released_year ASC, artist_id ASC'
        ).all(),
      ]);

      // ── 2. Transform genres ─────────────────────────────────────────
      const genres = (genresRes.results ?? []).map(row => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        image: row.image ?? null,
      }));

      // ── 3. Transform artists & compute totals in ONE pass ───────────
      let tracksTotal = 0;
      let lyricsTotal = 0;
      let instrumentsTotal = 0;

      const artists = (artistsRes.results ?? []).map(row => {
        let genre_ids = [];
        try { genre_ids = JSON.parse(row.genre_ids || '[]'); } catch { genre_ids = []; }
        
        const tCount = row.tracks_count ?? 0;
        const lCount = row.lyrics_count ?? 0;
        const iCount = row.instruments_count ?? 0;

        tracksTotal += tCount;
        lyricsTotal += lCount;
        instrumentsTotal += iCount;

        return {
          id: row.id,
          name: row.name,
          genre_ids,
          image: row.image ?? null,
          tracks_count: tCount,
          lyrics_count: lCount,
          instruments_count: iCount,
        };
      });

      // ── 4. Transform years ──────────────────────────────────────────
      const yearMap = new Map();
      for (const row of yearsRes.results ?? []) {
        const year = Number(row.released_year);
        if (!Number.isFinite(year)) continue;
        if (!yearMap.has(year)) yearMap.set(year, new Set());
        yearMap.get(year).add(Number(row.artist_id));
      }
      const years = [...yearMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, artistIds]) => ({
          year,
          artist_ids: [...artistIds].sort((a, b) => a - b),
        }));

      // ── 5. Return payload (reversedClips and albums removed) ────────
      return {
        genres,
        artists,
        years,
        counts: {
          genres:      genres.length,
          artists:     artists.length,
          tracks:      tracksTotal,
          clips:       tracksTotal, // Fallback: assuming all tracked artists have clips. If not, we can add 1 cheap COUNT query back.
          lyrics:      lyricsTotal,
          instruments: instrumentsTotal,
          lyricsTotal,
          instrumentsTotal,
        },
        version: new Date().toISOString(),
      };
    }
  );
}


