// game/src/components/game/TileGrid.jsx
import { useState, useEffect } from 'react';
import { Tile } from './Tile.jsx';

/**
 * Responsive tile grid.
 *
 * When `initialCount` is provided, on small screens (< sm) only the
 * first `initialCount` tiles are visible. A "Show more" button
 * reveals the next chunk of the same size on each click. Once
 * everything is visible, the button flips to "Show less" and
 * collapses back to the first chunk.
 *
 * On sm+ screens everything is visible and the button is hidden.
 *
 * `resetKey` re-collapses the grid when it changes (e.g. the artist
 * filter narrowed and the visible list is new).
 */
export function TileGrid({
  items,
  selectedIds,
  allSelected = false,
  onToggle,
  getKey    = (item) => item.id,
  getTitle  = (item) => item.name ?? item.display_name,
  getSubtitle,
  getImage  = (item) => item.image,
  getFallbackLetter = (item) =>
    (item.name ?? item.display_name ?? '?').trim().charAt(0).toUpperCase(),
  emptyMessage = 'Nothing to show.',
  disabled = false,
  initialCount,
  resetKey,
}) {
  const [visibleCount, setVisibleCount] = useState(
    typeof initialCount === 'number' ? initialCount : Infinity
  );

  // Collapse back to the initial chunk when the caller signals a
  // context change.
  useEffect(() => {
    if (typeof initialCount === 'number') setVisibleCount(initialCount);
  }, [resetKey, initialCount]);

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center">{emptyMessage}</p>
    );
  }

  const chunked = typeof initialCount === 'number' && items.length > initialCount;
  const isFullyExpanded = chunked && visibleCount >= items.length;
  const remaining = chunked ? items.length - visibleCount : 0;

  function handleMore() {
    if (!chunked) return;
    setVisibleCount((n) => Math.min(n + initialCount, items.length));
  }

  function handleLess() {
    if (!chunked) return;
    setVisibleCount(initialCount);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((item, i) => {
          const key = getKey(item);
          const selected = allSelected || selectedIds.has(key);
          const hiddenOnSmall = chunked && i >= visibleCount;

          return (
            <div
              key={key}
              className={hiddenOnSmall ? 'hidden sm:block' : ''}
            >
              <Tile
                title={getTitle(item)}
                subtitle={getSubtitle ? getSubtitle(item) : undefined}
                image={getImage(item)}
                fallbackLetter={getFallbackLetter(item)}
                selected={selected}
                disabled={disabled}
                onToggle={() => onToggle(key)}
              />
            </div>
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