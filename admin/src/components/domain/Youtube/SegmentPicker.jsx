import { Button } from '../../ui/Button';
import { computeEqualSegments, fmtSec } from '../../../lib/Youtube/segments';

/**
 * Per-video segment editor.
 *
 * Fully controlled — no local state. Parent owns `segments` and
 * updates them via `onChange`. This avoids the React 19 warning
 * about setState-inside-effect, and eliminates an entire class of
 * stale-state bugs.
 */
export default function SegmentPicker({
  video,
  segments,
  onChange,
  skipFirst,
  segmentCount,
}) {
  function toggleInclude(i) {
    const next = segments.map((s, idx) =>
      idx === i ? { ...s, included: !s.included } : s
    );
    onChange(next);
  }

  function editStart(i, value) {
    const num = Number(value);
    const next = segments.map((s, idx) =>
      idx === i ? { ...s, startSec: Number.isFinite(num) ? num : s.startSec } : s
    );
    onChange(next);
  }

  function editEnd(i, value) {
    const num = Number(value);
    const next = segments.map((s, idx) =>
      idx === i ? { ...s, endSec: Number.isFinite(num) ? num : s.endSec } : s
    );
    onChange(next);
  }

  function recompute() {
    const fresh = computeEqualSegments(video.durationSec, {
      count: segmentCount,
      skipFirst,
    });
    onChange(fresh);
  }

  const includedCount = segments.filter(s => s.included).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-ink-muted">
          {segments.length} segments ·{' '}
          <span className="font-medium text-ink">{includedCount}</span> included ·
          skip first {skipFirst}s
        </p>
        <Button variant="secondary" size="sm" onClick={recompute}>
          Recompute
        </Button>
      </div>

      <ul className="space-y-1.5">
        {segments.map((seg, i) => (
          <li
            key={i}
            className={[
              'flex items-center gap-3 rounded-md border px-3 py-2 transition-colors',
              seg.included
                ? 'border-brand-500/40 bg-brand-500/5'
                : 'border-surface-border bg-surface-subtle opacity-70',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={seg.included}
              onChange={() => toggleInclude(i)}
              className="w-4 h-4 shrink-0 accent-brand-500"
            />

            <span className="text-xs tabular-nums text-ink-subtle shrink-0 w-12">
              Seg {i + 1}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                value={seg.startSec}
                onChange={(e) => editStart(i, e.target.value)}
                step="0.1"
                min="0"
                max={video.durationSec}
                className="w-20 h-8 px-2 rounded bg-surface text-ink text-xs border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              />
              <span className="text-ink-subtle text-xs">→</span>
              <input
                type="number"
                value={seg.endSec}
                onChange={(e) => editEnd(i, e.target.value)}
                step="0.1"
                min="0"
                max={video.durationSec}
                className="w-20 h-8 px-2 rounded bg-surface text-ink text-xs border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              />
            </div>

            <span className="text-xs text-ink-subtle tabular-nums shrink-0">
              {fmtSec(seg.startSec)} – {fmtSec(seg.endSec)}
              {' '}({(seg.endSec - seg.startSec).toFixed(1)}s)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}