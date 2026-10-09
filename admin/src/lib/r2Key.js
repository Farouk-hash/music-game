// src/lib/r2key.js

/**
 * Parse a clip's R2 key into its component parts.
 *
 *   "clips/track-54398-start-10s.mp3"              → music, track 54398
 *   "clips/track-54398-custom-30s-10s.mp3"         → music, custom
 *   "clips/quran/track-92-1-start-10s.mp3"         → quran, track 92-1
 *   "clips/quran/track-92-1-custom-30s-10s.mp3"    → quran, custom
 */
export function parseR2Key(r2Key) {
  if (!r2Key || typeof r2Key !== 'string') return null;

  const isQuran = r2Key.startsWith('clips/quran/');

  // Standard (music or quran): clips[/quran]/track-{id}-{position}-{duration}s.mp3
  let m = r2Key.match(/^clips\/(?:quran\/)?track-([\w-]+)-([a-z]+)-(\d+)s\.mp3$/);
  if (m) {
    return {
      trackId: m[1],
      position: m[2],
      durationSec: Number(m[3]),
      startSec: 0,
      isQuran,
    };
  }

  // Custom: clips[/quran]/track-{id}-custom-{start}s-{duration}s.mp3
  m = r2Key.match(/^clips\/(?:quran\/)?track-([\w-]+)-custom-(\d+)s-(\d+)s\.mp3$/);
  if (m) {
    return {
      trackId: m[1],
      position: 'custom',
      startSec: Number(m[2]),
      durationSec: Number(m[3]),
      isQuran,
    };
  }

  return null;
}

/**
 * Build the serve URL for a clip.
 * The R2 key is passed as a query param — the Worker streams the exact object.
 */
export function serveUrl(cfBase, r2Key) {
  if (!cfBase || !r2Key) return null;
  return `${cfBase}/clips/serve?key=${encodeURIComponent(r2Key)}`;
}