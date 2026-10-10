// admin/src/routes/Youtube/segments.js

export const DEFAULT_SEGMENT_COUNT = 5;
export const DEFAULT_SKIP_FIRST_SECONDS = 8;

/**
 * Compute N equal segments for a video of the given duration.
 *
 * The "usable" portion runs from skipFirst to duration. Each segment
 * gets an equal slice of the usable portion.
 *
 * @param {number} durationSec  — total video duration
 * @param {object} [opts]
 * @param {number} [opts.count=5]              — number of segments
 * @param {number} [opts.skipFirst=8]          — seconds to skip at the start
 * @returns {Array<{ index, startSec, endSec, included }>}
 */
export function computeEqualSegments(durationSec, opts = {}) {
  const count     = Math.max(1, opts.count ?? DEFAULT_SEGMENT_COUNT);
  const skipFirst = Math.max(0, opts.skipFirst ?? DEFAULT_SKIP_FIRST_SECONDS);

  if (!Number.isFinite(durationSec) || durationSec <= 0) return [];
  if (skipFirst >= durationSec) return [];

  const usable = durationSec - skipFirst;
  const slice  = usable / count;

  return Array.from({ length: count }).map((_, i) => ({
    index:    i,
    startSec: Number((skipFirst + i * slice).toFixed(2)),
    endSec:   Number((skipFirst + (i + 1) * slice).toFixed(2)),
    included: true,
  }));
}

/**
 * Apply a global skip-first adjustment to an existing segment list
 * by recomputing from scratch. Preserves the "included" flags.
 */
export function recomputeSegments(durationSec, prevSegments, opts) {
  const next = computeEqualSegments(durationSec, opts);
  if (!prevSegments?.length) return next;
  return next.map((seg, i) => ({
    ...seg,
    included: prevSegments[i]?.included ?? seg.included,
  }));
}

/**
 * Format seconds as m:ss.
 */
export function fmtSec(s) {
  if (!Number.isFinite(s) || s < 0) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}