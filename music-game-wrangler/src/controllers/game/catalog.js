import { json } from '../../lib/response.js';

/**
 * GET /game/catalog
 * Returns everything the game client needs to render its pickers:
 *   genres, artists, years, and aggregate counts.
 *
 * The client caches this for 5 minutes. It changes only when the admin
 * publishes new data.
 *
 * Count semantics:
 *   genres  — every row in genres
 *   artists — artists with tracks_count > 0 (i.e. actually playable)
 *   tracks  — distinct (artist_id, name) — one per song, regardless of positions
 *   clips   — every rendition (forward + reversed) across all slots
 *   albums  — distinct (artist_id, album_name) in tracks with a non-null album_name
 *   lyrics  — every row in lyrics
 *
 * Years shape (S3 — nested by year):
 *   years: [{ year: 1998, artist_ids: [1, 5, 9] }, ...]
 *   Built from all album_years rows. The year picker in Setup filters
 *   by intersecting artist_ids with the currently-selected artists.
 */
export async function getCatalog(request, env) {
  const [genresRes, artistsRes, countsRow, yearsRes] = await Promise.all([
    env.DB.prepare(
      'SELECT id, name, display_name, image FROM genres ORDER BY display_name ASC'
    ).all(),
    env.DB.prepare(
      `
      SELECT id, name, genre_ids, image, tracks_count 
      FROM artists 
      WHERE tracks_count > 0  
      ORDER BY name ASC`
    ).all(),
    env.DB.prepare(`
      SELECT
        (SELECT COUNT(1) FROM genres)  AS genres,
        (SELECT COUNT(1) FROM artists WHERE tracks_count > 0) AS artists,
        (SELECT COUNT(1) FROM (
           SELECT DISTINCT artist_id, name FROM tracks
         ))                           AS tracks,
        (SELECT
            COALESCE(SUM(CASE WHEN r2_key IS NOT NULL THEN 1 ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN r2_reversed_key IS NOT NULL THEN 1 ELSE 0 END), 0)
         FROM tracks)                  AS clips,
        (SELECT COUNT(1) FROM (
           SELECT DISTINCT artist_id, album_name
           FROM tracks
           WHERE album_name IS NOT NULL AND TRIM(album_name) <> ''
         ))                           AS albums,
        (SELECT COUNT(1) FROM lyrics)  AS lyrics , 
        (SELECT COUNT(1) FROM tracks WHERE r2_reversed_key IS NOT NULL) AS reversedClips

    `).first(),
    env.DB.prepare(`
      SELECT released_year, artist_id
      FROM album_years
      ORDER BY released_year ASC, artist_id ASC
    `).all(),
  ]);

  const genres = (genresRes.results ?? []).map(row => ({
    id: row.id,
    name: row.name,
    display_name: row.display_name,
    image: row.image ?? null,
  }));

  const artists = (artistsRes.results ?? []).map(row => {
    let genre_ids = [];
    try { genre_ids = JSON.parse(row.genre_ids || '[]'); }
    catch { genre_ids = []; }
    return {
      id: row.id,
      name: row.name,
      genre_ids,
      image: row.image ?? null,
      tracks_count: row.tracks_count ?? 0,
    };
  });

  // Group (year, artist_id) rows into { year, artist_ids: [...] }.
  // Rows are already sorted by year, so this is a single pass.
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

  const version = new Date().toISOString();

  return json(
    {
      genres,
      artists,
      years,
      counts: {
        genres:  countsRow?.genres  ?? 0,
        artists: countsRow?.artists ?? 0,
        tracks:  countsRow?.tracks  ?? 0,
        clips:   countsRow?.clips   ?? 0,
        albums:  countsRow?.albums  ?? 0,
        lyrics:  countsRow?.lyrics  ?? 0,
        reversedClips: countsRow?.reversedClips ?? 0,

      },
      version,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}