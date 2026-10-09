// game/src/components/ui/SegmentedProgress.jsx
/**
 * Generic segmented progress bar.
 *
 *   <SegmentedProgress segments={[
 *     { fill: 1,   tier: 'correct' },
 *     { fill: 0.5, tier: 'highlight' },
 *     { fill: 0,   tier: 'neutral' },
 *   ]} />
 *
 * Each segment is a rounded track with an inner filled bar.
 *   - fill:  0..1 — the width of the colored inner bar
 *   - tier:  'correct' | 'highlight' | 'wrong' | 'neutral'
 *
 * The bar does not know or care what the segments mean. Callers
 * supply both the fill fraction and the color tier.
 */

const TIER_CLASS = {
  correct:   'bg-correct',
  highlight: 'bg-highlight',
  wrong:     'bg-wrong',
  neutral:   'bg-accent',
};

export function SegmentedProgress({ segments = [], className = '' }) {
  if (segments.length === 0) return null;

  return (
    <div className={`flex gap-1 ${className}`}>
      {segments.map((seg, i) => {
        const fill = Math.max(0, Math.min(1, seg.fill ?? 0));
        const tier = seg.tier ?? 'neutral';
        return (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden"
          >
            {fill > 0 && (
              <div
                className={`h-full transition-all duration-300 ${TIER_CLASS[tier]}`}
                style={{ width: `${fill * 100}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}