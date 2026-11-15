// server/scripts/instruments-locally/paths.js
//
// Paths for the "instruments-locally" pipeline.
//
// Output layout:
//   <OUTPUT_ROOT>/<artistId>_<artistSlug>/
//     ├─ <trackSlug>/                         ← no album
//     │    └─ full-nv.mp3, part-NN-nv.mp3, meta.json
//     └─ <albumSlug>/
//          └─ <trackSlug>/                   ← has album
//               └─ full-nv.mp3, part-NN-nv.mp3, meta.json
//
// Track folder is `<trackSlug>` unless a sibling folder already exists
// with the same name; then `<trackSlug>-<trackId>` disambiguates.
// The /status walker uses the presence of meta.json to tell track dirs
// apart from album dirs, so mixed depth is unambiguous.

import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';

const OUTPUT_ROOT = resolve(
  process.env.SPLIT_OUTPUT_ROOT
    ?? 'E:\\Instruments-locally',
);

/**
 * Filesystem-safe slug — identical to instrumental/paths.js.
 */
export function slugify(str) {
  return String(str ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    || 'unnamed';
}

/**
 * Artist folder: "<id>_<slugified name>"
 */
export function artistFolder(artistId, artistName) {
  const safeId = Number.isFinite(Number(artistId)) ? Number(artistId) : 0;
  return `${safeId}_${slugify(artistName)}`;
}

/**
 * Album folder: slug only.
 */
export function albumFolder(albumName) {
  return slugify(albumName);
}

/**
 * If `parentDir/<slug>` already exists AND is a directory (or has meta.json),
 * return `<slug>-<trackId>` instead. Otherwise return `<slug>`.
 */
export function uniqueTrackFolder(parentDir, trackName, trackId) {
  const base = slugify(trackName);
  const candidate = join(parentDir, base);
  if (!existsSync(candidate)) return base;
  const suffix = Number.isFinite(Number(trackId)) ? `-${Number(trackId)}` : `-${Date.now()}`;
  return `${base}${suffix}`;
}

/**
 * Full output dir for one track.
 *
 *   albumName is truthy → <ROOT>/<artist>/<album>/<track>
 *   albumName is null   → <ROOT>/<artist>/<track>
 *
 * Returns { artistDir, parentDir, trackDir }.
 */
export function trackOutputDir(artistId, artistName, albumName, trackName, trackId) {
  const artistDir = join(OUTPUT_ROOT, artistFolder(artistId, artistName));
  const parentDir = albumName
    ? join(artistDir, albumFolder(albumName))
    : artistDir;
  const folder = uniqueTrackFolder(parentDir, trackName, trackId);
  return {
    artistDir,
    parentDir,
    trackDir: join(parentDir, folder),
  };
}

export { OUTPUT_ROOT };