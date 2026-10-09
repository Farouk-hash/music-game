// music-game-wrangler/src/controllers/game/rounds-methods/distractors.js
import { dedupe } from '../../../utilities/dedupe.js';
import { normalize } from '../../../utilities/normalize.js';
import { shuffle } from '../../../utilities/shuffle.js';

import { safeParseArray } from '../../../utilities/safeParseArray.js';
import { chunkedIn, D1_CHUNK_SIZE } from '../../../utilities/chunkedIn.js';

/* ═══════════════════════════════════════════════════════════
   Distractor fetchers
   ═══════════════════════════════════════════════════════════ */

/**
 * Same artist → same genre(s) → scope → whole catalogue.
 * Tops up across tiers until 3 unique distractors are collected.
 */
export async function trackNameDistractors(env, artistId, excludeName, scopeArtistIds) {
  const picked = [];
  const seenNorm = new Set([normalize(excludeName)]);

  function pushName(name) {
    if (!name) return;
    const n = normalize(name);
    if (seenNorm.has(n)) return;
    seenNorm.add(n);
    picked.push(name);
  }

  // Fetch the correct artist's genre ids once for tier 2
  const artistRow = await env.DB.prepare(
    'SELECT genre_ids FROM artists WHERE id = ?'
  ).bind(artistId).first();
  const artistGenreIds = safeParseArray(artistRow?.genre_ids);

  // ── Tier 1: same artist's other tracks ──
  {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT name FROM tracks
       WHERE artist_id = ? AND name != ?
       LIMIT 6`
    ).bind(artistId, excludeName).all();
    for (const r of (results ?? [])) {
      if (picked.length >= 3) break;
      pushName(r.name);
    }
  }
  if (picked.length >= 3) return picked.slice(0, 3);

  // ── Tier 2: other artists in the same genre(s) ──
  if (artistGenreIds.length > 0) {
    const placeholders = artistGenreIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT t.name
       FROM tracks t, artists a, json_each(a.genre_ids) g
       WHERE t.artist_id = a.id
         AND t.artist_id != ?
         AND CAST(g.value AS INTEGER) IN (${placeholders})
         AND t.name != ?
       LIMIT 12`
    ).bind(artistId, ...artistGenreIds, excludeName).all();
    for (const r of (results ?? [])) {
      if (picked.length >= 3) break;
      pushName(r.name);
    }
  }
  if (picked.length >= 3) return picked.slice(0, 3);

    // ── Tier 3: other artists in scope ──
  {
    const rows = await chunkedIn(scopeArtistIds, D1_CHUNK_SIZE, async (chunk) => {
      const placeholders = chunk.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `SELECT DISTINCT name FROM tracks
         WHERE artist_id IN (${placeholders})
           AND artist_id != ?
           AND name != ?
         LIMIT 12`
      ).bind(...chunk, artistId, excludeName).all();
      return results ?? [];
    });
    // Shuffle across chunks so tier ordering isn't biased to the first chunk.
    for (const r of shuffle(rows)) {
      if (picked.length >= 3) break;
      pushName(r.name);
    }
  }
  if (picked.length >= 3) return picked.slice(0, 3);

  // ── Tier 4: whole catalogue ──
  {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT name FROM tracks
       WHERE name != ?
       LIMIT 12`
    ).bind(excludeName).all();
    for (const r of (results ?? [])) {
      if (picked.length >= 3) break;
      pushName(r.name);
    }
  }

  return picked.slice(0, 3);
}

/**
 * Same artist's other albums → same genre(s) → scope → whole catalogue.
 * Tops up across tiers until 3 unique album names are collected.
 */
export async function albumNameDistractors(env, artistId, correctAlbumName, scopeArtistIds) {
  const picked = [];
  const seenNorm = new Set([normalize(correctAlbumName)]);

  function pushAlbum(name) {
    if (!name) return;
    const n = normalize(name);
    if (seenNorm.has(n)) return;
    seenNorm.add(n);
    picked.push(name);
  }

  const artistRow = await env.DB.prepare(
    'SELECT genre_ids FROM artists WHERE id = ?'
  ).bind(artistId).first();
  const artistGenreIds = safeParseArray(artistRow?.genre_ids);

  // ── Tier 1: same artist's other albums ──
  {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT album_name FROM tracks
       WHERE artist_id = ?
         AND album_name IS NOT NULL
         AND album_name != ?
       LIMIT 6`
    ).bind(artistId, correctAlbumName).all();
    for (const r of (results ?? [])) {
      if (picked.length >= 3) break;
      pushAlbum(r.album_name);
    }
  }
  if (picked.length >= 3) return picked.slice(0, 3);

  // ── Tier 2: other artists in the same genre(s) ──
  if (artistGenreIds.length > 0) {
    const placeholders = artistGenreIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT t.album_name
       FROM tracks t, artists a, json_each(a.genre_ids) g
       WHERE t.artist_id = a.id
         AND t.artist_id != ?
         AND CAST(g.value AS INTEGER) IN (${placeholders})
         AND t.album_name IS NOT NULL
         AND t.album_name != ?
       LIMIT 12`
    ).bind(artistId, ...artistGenreIds, correctAlbumName).all();
    for (const r of (results ?? [])) {
      if (picked.length >= 3) break;
      pushAlbum(r.album_name);
    }
  }
  if (picked.length >= 3) return picked.slice(0, 3);

  // ── Tier 3: other artists in scope ──
  {
    const rows = await chunkedIn(scopeArtistIds, D1_CHUNK_SIZE, async (chunk) => {
      const placeholders = chunk.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `SELECT DISTINCT album_name FROM tracks
         WHERE artist_id IN (${placeholders})
           AND artist_id != ?
           AND album_name IS NOT NULL
           AND album_name != ?
         LIMIT 12`
      ).bind(...chunk, artistId, correctAlbumName).all();
      return results ?? [];
    });
    for (const r of shuffle(rows)) {
      if (picked.length >= 3) break;
      pushAlbum(r.album_name);
    }
  }
  if (picked.length >= 3) return picked.slice(0, 3);

  // ── Tier 4: whole catalogue ──
  {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT album_name FROM tracks
       WHERE album_name IS NOT NULL
         AND album_name != ?
       LIMIT 12`
    ).bind(correctAlbumName).all();
    for (const r of (results ?? [])) {
      if (picked.length >= 3) break;
      pushAlbum(r.album_name);
    }
  }

  return picked.slice(0, 3);
}

/* ═══════════════════════════════════════════════════════════
   artistNameDistractors

   Preference order:
     Tier 0 — other artists the player selected (scopeArtistIds)
     Tier 1 — artists in the same genre(s) as the correct artist
     Tier 2 — any artist in the catalogue with clips

   The Tier 0 preference is what makes "who is this artist?"
   non-trivial when the player has picked a small set: the
   distractors are the *other* names they chose, so the question
   can't be answered by elimination alone.

   Tiers 1 and 2 top up when fewer than 3 names are available
   from the preferred tiers. Every tier dedupes by id AND by
   normalized name, and shuffles before picking so the choice
   isn't positional.

   Used by both `name-artist` and `name-featured` in tryBuild.
   ═══════════════════════════════════════════════════════════ */

export async function artistNameDistractors(env, correctArtist, scopeArtistIds) {
  const picked = [];
  const seenIds = new Set([correctArtist.id]);
  const seenNames = new Set([normalize(correctArtist.name)]);

  function pushArtist(row) {
    if (!row || !row.name) return;
    if (row.id != null && seenIds.has(row.id)) return;
    const n = normalize(row.name);
    if (seenNames.has(n)) return;
    if (row.id != null) seenIds.add(row.id);
    seenNames.add(n);
    picked.push(row.name);
  }

  // ── Tier 0: other artists the player selected ──
  // This is the highest-priority source. When the player picks
  // 2–4 artists, those names become the distractors, making the
  // question genuinely hard (every option is a name they chose).
  const otherScopeIds = scopeArtistIds.filter(id => id !== correctArtist.id);
  if (otherScopeIds.length > 0) {
    const rows = await chunkedIn(otherScopeIds, D1_CHUNK_SIZE, async (chunk) => {
      const placeholders = chunk.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        `SELECT DISTINCT id, name FROM artists
         WHERE id IN (${placeholders})`
      ).bind(...chunk).all();
      return results ?? [];
    });
    for (const r of shuffle(rows)) {
      if (picked.length >= 3) break;
      pushArtist(r);
    }
  }
  if (picked.length >= 3) return shuffle(picked.slice(0, 3));

  // ── Tier 1: same genre(s) as the correct artist ──
  const genreIds = safeParseArray(correctArtist.genre_ids);
  if (genreIds.length > 0) {
    const placeholders = genreIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT a.id, a.name
       FROM artists a, json_each(a.genre_ids) g
       WHERE CAST(g.value AS INTEGER) IN (${placeholders})
         AND a.id != ?
         AND EXISTS (
           SELECT 1 FROM tracks t
           WHERE t.artist_id = a.id AND t.r2_key IS NOT NULL
         )
       LIMIT 12`
    ).bind(...genreIds, correctArtist.id).all();
    for (const r of shuffle(results ?? [])) {
      if (picked.length >= 3) break;
      pushArtist(r);
    }
  }
  if (picked.length >= 3) return shuffle(picked.slice(0, 3));

  // ── Tier 2: any artist in the catalogue with clips ──
  {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT id, name FROM artists
       WHERE id != ? AND tracks_count > 0
       LIMIT 12`
    ).bind(correctArtist.id).all();
    for (const r of shuffle(results ?? [])) {
      if (picked.length >= 3) break;
      pushArtist(r);
    }
  }

  return shuffle(picked.slice(0, 3));
}