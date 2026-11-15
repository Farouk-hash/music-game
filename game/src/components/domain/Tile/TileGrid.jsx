// game/src/components/game/TileGrid.jsx
import { useState, useEffect } from 'react';
import { Tile } from './Tile.jsx';
import { IconPlus, IconMinus } from '@/icons';

export function TileGrid({
  items,
  selectedIds,
  allSelected = false,
  onToggle,
  onTileClick = null,
  getKey    = (item) => item.id,
  getTitle  = (item) => item.name ?? item.display_name,
  getSubtitle,
  getImage  = (item) => item.image,
  getFallbackLetter = (item) =>
    (item.name ?? item.display_name ?? '?').trim().charAt(0).toUpperCase(),
  getTileClassName,
  emptyMessage = 'Nothing to show.',
  disabled = false,
  initialCount,
  resetKey,
  renderHeart,
  view = 'grid',
  paginated = false,
  cols, // <-- Added for the mobile layout
}) {
  const [visibleCount, setVisibleCount] = useState(
    typeof initialCount === 'number' ? initialCount : Infinity
  );

  useEffect(() => {
    if (typeof initialCount === 'number') setVisibleCount(initialCount);
  }, [resetKey, initialCount]);

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center">{emptyMessage}</p>
    );
  }

  const chunked = !paginated && typeof initialCount === 'number' && items.length > initialCount;
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

  const containerClass =
    view === 'list'
      ? 'flex flex-col gap-2'
      : view === 'dense'
      ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2'
      : cols || 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4';

  return (
    <div className="space-y-3">
      <div className={containerClass}>
        {items.map((item, i) => {
          const key = getKey(item);
          const selected = allSelected || selectedIds.has(key);
          const hiddenOnSmall = chunked && i >= visibleCount;
          const customClass = getTileClassName ? getTileClassName(item) : '';

          return (
            <div key={key} className={hiddenOnSmall ? 'hidden sm:block' : ''}>
              <Tile
                title={getTitle(item)}
                subtitle={getSubtitle ? getSubtitle(item) : undefined}
                image={getImage(item)}
                fallbackLetter={getFallbackLetter(item)}
                selected={selected}
                disabled={disabled}
                onToggle={() => onToggle?.(key)}
                onTileClick={onTileClick ? () => onTileClick(item) : null}
                heart={renderHeart ? renderHeart(item) : null}
                view={view}
                className={customClass}
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
            sm:hidden w-full py-2 flex items-center justify-center
            text-ink-muted hover:text-accent
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
            rounded-md transition-colors
          "
          title={isFullyExpanded ? 'Show less' : `Show ${Math.min(initialCount, remaining)} more`}
        >
          {isFullyExpanded ? (
            <IconMinus className="w-5 h-5" />
          ) : (
            <IconPlus className="w-5 h-5" />
          )}
        </button>
      )}
    </div>
  );
}