// game/src/components/domain/Setup/Genres/GenreTileGrid.jsx
import { useMemo } from 'react';
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '@/hooks/setup/useFavoriteToggles.js';
import { useMediaQuery } from '@/hooks/ui/useMediaQuery.js';
import { useSmartPagination } from '@/hooks/ui/useSmartPagination.js';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx';

const PAGE_SIZE_MOBILE = 4;
const PAGE_SIZE_DESKTOP = 10;

const BATCH_SIZE_GRID = 4;
const BATCH_SIZE_DENSE = 6;

export function GenreTileGrid({
  genres,
  selectedIds,
  onToggle,
  allSelected = false,
  onUnfavorited,
  view = 'grid',
  pageSize,
}) {
  const { isGenreFavorite, toggleGenre } = useFavoriteToggles();
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const resolvedPageSize = pageSize != null
    ? pageSize
    : (isDesktop ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE);

  const paginate = resolvedPageSize > 0 && genres.length > resolvedPageSize;

  const { pagination, direction } = useSmartPagination(
    paginate && isDesktop ? genres : [],
    {
      pageSize: resolvedPageSize || 9999,
      resetKey: `genres|${genres.length}|${resolvedPageSize}`,
    }
  );

  const visible = isDesktop && paginate ? pagination.items : genres;

  const batchSize = view === 'dense' ? BATCH_SIZE_DENSE : BATCH_SIZE_GRID;

  const mobileBatches = useMemo(() => {
    if (isDesktop) return [];
    const batches = [];
    for (let i = 0; i < visible.length; i += batchSize) {
      batches.push(visible.slice(i, i + batchSize));
    }
    return batches;
  }, [visible, isDesktop, batchSize]);

  const tileGridProps = {
    selectedIds,
    onToggle,
    allSelected,
    getTitle: (g) => g.display_name || g.name,
    getImage: (g) => g.image,
    emptyMessage: "No genres available.",
    initialCount: 8,
    view,
    renderHeart: (g) => {
      const active = isGenreFavorite(g.id);
      return (
        <HeartButton
          active={active}
          onClick={async () => {
            try {
              await toggleGenre(g.id);
              if (active) onUnfavorited?.(g.id);
            } catch {}
          }}
        />
      );
    },
  };

  return (
    <div className="space-y-4">
      <Reveal
        key={paginate && isDesktop ? pagination.page : 'all'}
        direction={direction}
        distance={80}
        duration={400}
      >
        {isDesktop ? (
          <TileGrid
            {...tileGridProps}
            items={visible}
            paginated={paginate}
          />
        ) : (
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {mobileBatches.map((batch, batchIndex) => (
              <div 
                key={batchIndex} 
                className="snap-center shrink-0 w-[calc(100vw-48px)]"
              >
                <TileGrid
                  {...tileGridProps}
                  items={batch}
                  paginated={false}
                  cols={view === 'dense' 
                    ? "grid grid-cols-3 gap-2" 
                    : "grid grid-cols-2 gap-3"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Reveal>

      {paginate && isDesktop && <Pagination pagination={pagination} />}
    </div>
  );
}