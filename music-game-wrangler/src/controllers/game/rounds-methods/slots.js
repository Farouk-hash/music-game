// music-game-wrangler/src/controllers/game/rounds-methods/slots.js
import { shuffle } from '../../../utilities/shuffle.js';

/* ═══════════════════════════════════════════════════════════
   Slot picker.

   `rendition` — 'forward' (default) or 'reverse'.
   When 'reverse', only slots with `r2_reversed_key` are eligible,
   and the slot's `r2_key` field is remapped to point at the
   reversed rendition so everything downstream works unchanged.

   When `years` is non-empty, clips are restricted to those whose
   album appears in album_years with a matching released_year.
   ═══════════════════════════════════════════════════════════ */

const SLOT_COLUMNS_FORWARD = 'id, name, artist_id, r2_key, position, album_name, featured_artists';
const SLOT_COLUMNS_REVERSE = 'id, name, artist_id, r2_reversed_key, position, album_name, featured_artists';

/**
 * Evenly interleave `featured` items into `rest`.
 */
function interleave(featured, rest) {
  const out = [];
  const total = featured.length + rest.length;
  if (featured.length === 0) return rest.slice();
  if (rest.length === 0) return featured.slice();

  const step = total / featured.length;
  let fi = 0, ri = 0;
  for (let i = 0; i < total; i++) {
    const wantFeatured = fi < featured.length && i >= Math.floor(fi * step + step * 0.5);
    if (wantFeatured) {
      out.push(featured[fi++]);
    } else if (ri < rest.length) {
      out.push(rest[ri++]);
    } else {
      out.push(featured[fi++]);
    }
  }
  return out;
}

/**
 * Remap a slot row so its `r2_key` points at the requested rendition.
 * No-op for forward (the row already has `r2_key`).
 */
function remapRendition(row, rendition) {
  if (rendition !== 'reverse') return row;
  return {
    ...row,
    r2_key: row.r2_reversed_key,
  };
}

/**
 * All slots for one artist that have the requested rendition.
 *
 * `years` — optional album year filter.
 * `rendition` — 'forward' (default) or 'reverse'.
 */
export async function slotsForArtist(env, artistId, years = [], rendition = 'forward') {
  const isReverse = rendition === 'reverse';
  const keyColumn = isReverse ? 'r2_reversed_key' : 'r2_key';
  const slotColumns = isReverse ? SLOT_COLUMNS_REVERSE : SLOT_COLUMNS_FORWARD;
  const hasYears = Array.isArray(years) && years.length > 0;

  if (!hasYears) {
    const featured = await env.DB.prepare(
      `SELECT ${slotColumns}
       FROM tracks
       WHERE artist_id = ?
         AND ${keyColumn} IS NOT NULL
         AND featured_artists IS NOT NULL
         AND featured_artists != ''`
    ).bind(artistId).all();

    const rest = await env.DB.prepare(
      `SELECT ${slotColumns}
       FROM tracks
       WHERE artist_id = ?
         AND ${keyColumn} IS NOT NULL
         AND (featured_artists IS NULL OR featured_artists = '')`
    ).bind(artistId).all();

    const featuredShuffled = shuffle(featured.results ?? []).map(r => remapRendition(r, rendition));
    const restShuffled     = shuffle(rest.results ?? []).map(r => remapRendition(r, rendition));

    return interleave(featuredShuffled, restShuffled);
  }

  // Year-filtered path — join album_years on (artist_id, album_name).
  const yearPh = years.map(() => '?').join(',');

  const featured = await env.DB.prepare(
    `SELECT t.id, t.name, t.artist_id, t.${keyColumn} AS slot_key,
            t.position, t.album_name, t.featured_artists
     FROM tracks t
     JOIN album_years ay
       ON ay.artist_id = t.artist_id
      AND ay.album_name = t.album_name
     WHERE t.artist_id = ?
       AND t.${keyColumn} IS NOT NULL
       AND t.featured_artists IS NOT NULL
       AND t.featured_artists != ''
       AND ay.released_year IN (${yearPh})`
  ).bind(artistId, ...years).all();

  const rest = await env.DB.prepare(
    `SELECT t.id, t.name, t.artist_id, t.${keyColumn} AS slot_key,
            t.position, t.album_name, t.featured_artists
     FROM tracks t
     JOIN album_years ay
       ON ay.artist_id = t.artist_id
      AND ay.album_name = t.album_name
     WHERE t.artist_id = ?
       AND t.${keyColumn} IS NOT NULL
       AND (t.featured_artists IS NULL OR t.featured_artists = '')
       AND ay.released_year IN (${yearPh})`
  ).bind(artistId, ...years).all();

  // In the year-filtered branch we aliased the column to slot_key,
  // so remap to r2_key explicitly.
  const remapYearRow = (row) => ({ ...row, r2_key: row.slot_key, slot_key: undefined });

  const featuredShuffled = shuffle(featured.results ?? []).map(remapYearRow);
  const restShuffled     = shuffle(rest.results ?? []).map(remapYearRow);

  return interleave(featuredShuffled, restShuffled);
}

/**
 * Round-robin across artists.
 *
 * `years` — optional album year filter.
 * `rendition` — 'forward' (default) or 'reverse'.
 */
export async function pickSlotsVaried(env, artistIds, count, years = [], rendition = 'forward') {
  const perArtist = new Map();
  for (const id of artistIds) {
    const slots = await slotsForArtist(env, id, years, rendition);
    if (slots.length > 0) perArtist.set(id, slots);
  }
  if (perArtist.size === 0) return [];

  const picked = [];

  // Pass 1: one slot per artist (shuffled order)
  const order = shuffle([...perArtist.keys()]);
  for (const id of order) {
    if (picked.length >= count) break;
    const bucket = perArtist.get(id);
    if (bucket.length === 0) continue;
    picked.push(bucket.shift());
  }

  // Subsequent passes
  let pass = 2;
  while (picked.length < count) {
    let addedAny = false;
    const passOrder = shuffle([...perArtist.keys()]);
    for (const id of passOrder) {
      if (picked.length >= count) break;
      const bucket = perArtist.get(id);
      if (bucket.length === 0) continue;
      picked.push(bucket.shift());
      addedAny = true;
    }
    if (!addedAny) break;
    pass += 1;
    if (pass > 100) break;
  }

  return picked;
}