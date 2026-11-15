// game/src/components/domain/Setup/Years/YearTileGrid.jsx
import { useMemo } from 'react';
import { useSmartPagination } from '@/hooks/ui/useSmartPagination.js';
import { useMediaQuery } from '@/hooks/ui/useMediaQuery.js';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx';

// Mobile: 12 years per batch/page. Desktop: 24 years per page.
const PAGE_SIZE_MOBILE = 12;
const PAGE_SIZE_DESKTOP = 24;

export function YearTileGrid({
  years = [],
  validArtistIds,
  selectedYears,
  onToggle,
  resetKey,
}) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const resolvedPageSize = isDesktop ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE;
  
  const paginate = years.length > resolvedPageSize;

  // Only paginate on desktop now
  const { pagination, direction } = useSmartPagination(
    paginate && isDesktop ? years : [],
    {
      pageSize: resolvedPageSize,
      resetKey: `${resetKey ?? ''}|${years.length}`,
    }
  );

  if (years.length === 0) {
    return (
      <p className="text-sm text-ink-subtle text-center py-6 border border-dashed border-border rounded-md">
        No album years in the catalogue yet.
      </p>
    );
  }

  const hasSelection = validArtistIds && validArtistIds.size > 0;
  // Use pagination items on desktop, raw years on mobile
  const visible = isDesktop && paginate ? pagination.items : years;

  // Chunk the years into batches of 12 for the mobile horizontal scroll
  const mobileBatches = useMemo(() => {
    if (isDesktop) return [];
    const batches = [];
    for (let i = 0; i < visible.length; i += PAGE_SIZE_MOBILE) {
      batches.push(visible.slice(i, i + PAGE_SIZE_MOBILE));
    }
    return batches;
  }, [visible, isDesktop]);

  const renderYears = (yearList) => {
    return yearList.map(({ year, artist_ids }) => {
      const enabled =
        !hasSelection ||
        artist_ids.some((id) => validArtistIds.has(id));

      const selected = selectedYears?.has(year) ?? false;

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
    });
  };

  return (
    <div className="space-y-4">
      <Reveal
        key={paginate && isDesktop ? pagination.page : 'all'}
        direction={direction}
        distance={80}
        duration={1000}
      >
        {isDesktop ? (
          /* DESKTOP: Standard Grid */
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {renderYears(visible)}
          </div>
        ) : (
          /* MOBILE: Horizontal Scroll Batches */
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {mobileBatches.map((batch, batchIndex) => (
              <div 
                key={batchIndex} 
                className="snap-center shrink-0 w-[calc(100vw-48px)]"
              >
                {/* Each batch is a 4-column grid (12 items = 4 cols x 3 rows) */}
                <div className="grid grid-cols-4 gap-2">
                  {renderYears(batch)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Reveal>

      {/* Only show standard pagination on desktop */}
      {paginate && isDesktop && <Pagination pagination={pagination} />}
    </div>
  );
}