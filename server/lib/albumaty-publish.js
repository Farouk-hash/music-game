// server/lib/albumaty-publish.js
/**
 * Publish an albumaty track to R2 + D1 via the existing publish-clips
 * and artists routes. Reuses the same pipeline that matb3aa/mp3quran use.
 */

import { fetchSongMp3Url } from './albumaty-crawl.js';

const CF_BASE = process.env.CF_API_BASE;
const LOCAL_SERVER = process.env.PIPELINE_SELF_URL || 'http://localhost:3001';

if (!CF_BASE) throw new Error('CF_API_BASE is not set in .env');

const DEFAULT_GENRE_IDS = [45];

/* ═══════════════════════════════════════════════════════════
   Artist helpers
   ═══════════════════════════════════════════════════════════ */

/**
 * Find or create a D1 artist for an albumaty artist.
 * Returns { id, created } where created=true means a new row was made.
 *
 * If the artist already exists (matched by name), their genre_ids are
 * left untouched. New artists get the genre_ids passed in (or [45]).
 */

export async function ensureArtist({ albumatyId, name, image, genre_ids }) {
  const genres = Array.isArray(genre_ids) && genre_ids.length > 0
    ? genre_ids
    : DEFAULT_GENRE_IDS;

  // 1. Search for an existing artist with this name
  const searchRes = await fetch(
    `${LOCAL_SERVER}/api/cloudflare/artists?search=${encodeURIComponent(name)}`
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    const exact = (data.artists ?? []).find(a => a.name === name);
    if (exact) return { id: exact.id, created: false };
  }

  // 2. Not found — create a new one with a random 90000+ ID
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidateId = 90000 + Math.floor(Math.random() * 10000);
    try {
      const res = await fetch(`${LOCAL_SERVER}/api/cloudflare/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: candidateId,
          name,
          genre_ids: genres,
          image: image ?? null,
          tracks_count: 0,
          is_customized: 1,
          source: 'albumaty',        // ← the new field
        }),
      });
      if (res.ok || res.status === 201) {
        return { id: candidateId, created: true };
      }
      if (res.status === 409) continue;
      const errText = await res.text();
      throw new Error(`artist create failed: ${res.status} ${errText.slice(0, 200)}`);
    } catch (e) {
      if (attempt === 19) throw e;
    }
  }

  throw new Error('Could not find a free artist ID after 20 attempts');
}

/* ═══════════════════════════════════════════════════════════
   Track publish
   ═══════════════════════════════════════════════════════════ */

/**
 * Publish one albumaty song: fetch its MP3 URL and ask the local
 * /tracks/publish-clips route to produce start + middle clips.
 *
 * @param {object} opts
 * @param {number} opts.albumatySongId
 * @param {string} opts.name
 * @param {number} opts.artistId
 * @param {string|null} [opts.albumName]
 * @param {string} [opts.source]
 */
export async function publishOneTrack({
  albumatySongId,
  name,
  artistId,
  albumName = null,
  source = 'music',
}) {
  const result = {
    albumatySongId,
    name,
    albumName,
    ok: false,
    results: [],
    errors: [],
  };

  try {
    const mp3Url = await fetchSongMp3Url(albumatySongId);

    const trackId = 9000000 + (Date.now() % 1000000) + (albumatySongId % 1000);

    const shared = {
      trackId,
      sourceSrc: mp3Url,
      name,
      artistId,
      startSec: 0,
      seconds: 10,
      forward: true,
      reversed: false,
      source,
      album_name: albumName ?? null,
      featured_artists: null,
    };

    const clips = [
      { ...shared, position: 'start' },
      { ...shared, position: 'middle' },
    ];

    const res = await fetch(`${LOCAL_SERVER}/api/cloudflare/tracks/publish-clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips }),
    });

    if (!res.ok) {
      const errText = await res.text();
      result.errors.push({
        stage: 'publish-clips',
        error: `${res.status} ${errText.slice(0, 200)}`,
      });
      return result;
    }

    const data = await res.json();
    result.results = data.results ?? [];
    result.errors = Array.isArray(data.results)
      ? data.results.filter(r => !r.ok).map(r => ({ stage: 'render', error: r.error }))
      : [];
    result.ok = (data.succeeded ?? 0) > 0 && result.errors.length === 0;
    return result;
  } catch (e) {
    result.errors.push({ stage: 'unknown', error: e.message });
    return result;
  }
}