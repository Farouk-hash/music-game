// game/src/components/domain/Setup/Years/YearTileGrid.jsx
import { useState, useEffect } from 'react';

/**
 * Tile grid of release years for the Setup picker.
 *
 * On small screens, only the first `initialCount` years are shown.
 * "Show more" reveals the next chunk of the same size. Once all are
 * visible, the button flips to "Show less".
 *
 * On sm+ screens everything is visible and the button is hidden.
 */
export function YearTileGrid({
  years = [],
  validArtistIds,
  selectedYears,
  onToggle,
  initialCount = 12,
  resetKey,
  
}) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [resetKey, initialCount]);

  if (years.length === 0) {
    return (
      <p className="text-sm text-ink-subtle text-center py-6 border border-dashed border-border rounded-md">
        No album years in the catalogue yet.
      </p>
    );
  }

  const hasSelection = validArtistIds && validArtistIds.size > 0;
  const chunked = years.length > initialCount;
  const isFullyExpanded = chunked && visibleCount >= years.length;
  const remaining = chunked ? years.length - visibleCount : 0;

  function handleMore() {
    if (!chunked) return;
    setVisibleCount((n) => Math.min(n + initialCount, years.length));
  }

  function handleLess() {
    if (!chunked) return;
    setVisibleCount(initialCount);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {years.map(({ year, artist_ids }, i) => {
          const enabled =
            !hasSelection ||
            artist_ids.some((id) => validArtistIds.has(id));

          const selected = selectedYears?.has(year) ?? false;
          const hiddenOnSmall = chunked && i >= visibleCount;

          return (
            <button
              key={year}
              type="button"
              disabled={!enabled}
              aria-pressed={selected}
              onClick={() => enabled && onToggle(year)}
              className={[
                'h-12 rounded-md border text-sm tabular-nums transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                hiddenOnSmall ? 'hidden sm:block' : '',
                selected
                  ? 'bg-accent text-bg border-accent font-medium'
                  : enabled
                    ? 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink'
                    : 'bg-surface-2/50 text-ink-subtle border-border/50 cursor-not-allowed opacity-40',
              ].join(' ')}
            >
              {year}
            </button>
          );
        })}
      </div>

      {chunked && (
        <button
          type="button"
          onClick={isFullyExpanded ? handleLess : handleMore}
          className="
            sm:hidden w-full py-2 text-sm text-ink-muted hover:text-accent
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
            rounded-md transition-colors
          "
        >
          {isFullyExpanded
            ? 'Show less'
            : `Show ${Math.min(initialCount, remaining)} more`}
        </button>
      )}
    </div>
  );
}