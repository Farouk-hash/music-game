// rounds-methods/slots.js
import { shuffle } from '../../../utilities/shuffle.js';
import { loadArtistData } from '../../../lib/cache.js';

function interleave(featured, rest) {
  const total = featured.length + rest.length;
  if (featured.length === 0) return rest.slice();
  if (rest.length === 0) return featured.slice();

  const out = [];
  const step = total / featured.length;
  let fi = 0, ri = 0;
  for (let i = 0; i < total; i++) {
    const wantFeatured = fi < featured.length && i >= Math.floor(fi * step + step * 0.5);
    if (wantFeatured) out.push(featured[fi++]);
    else if (ri < rest.length) out.push(rest[ri++]);
    else out.push(featured[fi++]);
  }
  return out;
}

function mapRendition(row, rendition) {
  return rendition === 'reverse' ? { ...row, r2_key: row.r2_reversed_key } : row;
}

/** Eligible tracks for one artist, split into featured / rest. Never mutates pool data. */
function splitEligible(d, years, yearSet, rendition) {
  const keyCol = rendition === 'reverse' ? 'r2_reversed_key' : 'r2_key';
  const featured = [];
  const rest = [];
  for (const r of d.t ?? []) {
    if (!r[keyCol]) continue;
    if (years.length > 0) {
      const y = d.y?.[r.album_name];
      if (y == null || !yearSet.has(y)) continue;
    }
    const m = mapRendition(r, rendition);
    if (r.featured_artists && r.featured_artists.trim() !== '') featured.push(m);
    else rest.push(m);
  }
  return { featured, rest };
}

/** Round-robin drain of per-artist buckets (one per artist per pass). */
function drain(perArtist, count) {
  const picked = [];
  let pass = 0;
  while (picked.length < count && pass < 100) {
    let added = false;
    for (const id of shuffle([...perArtist.keys()])) {
      if (picked.length >= count) break;
      const bucket = perArtist.get(id);
      if (bucket.length === 0) continue;
      picked.push(bucket.shift());
      added = true;
    }
    if (!added) break;
    pass++;
  }
  return picked;
}

/** Kept for compatibility with callers that want a single artist. */
export async function slotsForArtist(env, artistId, years = [], rendition = 'forward') {
  const data = await loadArtistData(env, 'core', [artistId]);
  const d = data.get(String(artistId));
  if (!d) return [];
  const { featured, rest } = splitEligible(d, years, new Set(years), rendition);
  return interleave(shuffle(featured), shuffle(rest));
}

/**
 * Pick `count` slots, round-robin across the given artists.
 * Callers should pass a small "work set" of artists (see rounds.js).
 */
export async function pickSlotsVaried(env, artistIds, count, years = [], rendition = 'forward') {
  if (!artistIds.length || count <= 0) return [];
  const data = await loadArtistData(env, 'core', artistIds);
  const yearSet = new Set(years);

  const perArtist = new Map();
  for (const id of artistIds) {
    const d = data.get(String(id));
    if (!d) continue;
    const { featured, rest } = splitEligible(d, years, yearSet, rendition);
    if (featured.length + rest.length === 0) continue;
    perArtist.set(id, interleave(shuffle(featured), shuffle(rest)));
  }
  if (perArtist.size === 0) return [];
  return drain(perArtist, count);
}

/** Slots that have featured artists (replaces the old ORDER BY RANDOM() D1 query). */
export async function pickFeaturedSlots(env, artistIds, limit, years = [], rendition = 'forward') {
  if (!artistIds.length || limit <= 0) return [];
  const data = await loadArtistData(env, 'core', artistIds);
  const yearSet = new Set(years);

  const perArtist = new Map();
  for (const id of artistIds) {
    const d = data.get(String(id));
    if (!d) continue;
    const { featured } = splitEligible(d, years, yearSet, rendition);
    if (featured.length > 0) perArtist.set(id, shuffle(featured));
  }
  return drain(perArtist, limit);
}