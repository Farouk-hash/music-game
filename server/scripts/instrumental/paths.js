// server/scripts/instrumental/paths.js
import { resolve, join } from 'node:path';

const OUTPUT_ROOT = resolve(
  process.cwd(),
  'server',
  'instrumental-output',
);

/**
 * Filesystem-safe slug for Arabic or Latin names.
 *  - Keeps letters and numbers (\p{L}\p{N})
 *  - Strips punctuation and control chars
 *  - Collapses whitespace to a single '-'
 *  - Caps length at 80 chars
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
 * Folder for one artist: "<id>_<slugified name>"
 */
export function artistFolder(artistId, artistName) {
  return `${artistId}_${slugify(artistName)}`;
}

/**
 * Folder for one track inside an artist.
 */
export function trackFolder(trackName) {
  return slugify(trackName);
}

/**
 * Full path for a track's output folder.
 */
export function trackOutputDir(artistId, artistName, trackName) {
  return join(
    OUTPUT_ROOT,
    artistFolder(artistId, artistName),
    trackFolder(trackName),
  );
}

export { OUTPUT_ROOT };