// game/src/components/domain/Setup/Artists/ArtistTileGrid.jsx
import { useMemo } from 'react';
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '@/hooks/setup/useFavoriteToggles.js';
import { useMediaQuery } from '@/hooks/ui/useMediaQuery.js';
import { useSmartPagination } from '@/hooks/ui/useSmartPagination.js';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx';

const PAGE_SIZE_MOBILE = 10;
const PAGE_SIZE_DESKTOP = 15;

// Batch sizes depending on view type
const BATCH_SIZE_GRID = 6;
const BATCH_SIZE_DENSE = 9;

export function ArtistTileGrid({
  artists,
  selectedIds,
  onToggle,
  resetKey,
  onUnfavorited,
  view = 'grid',
  pageSize,
}) {
  const { isArtistFavorite, toggleArtist } = useFavoriteToggles();
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const resolvedPageSize = pageSize != null
    ? pageSize
    : (isDesktop ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE);

  const paginate = resolvedPageSize > 0 && artists.length > resolvedPageSize;

  const { pagination, direction } = useSmartPagination(
    paginate && isDesktop ? artists : [],
    {
      pageSize: resolvedPageSize || 9999,
      resetKey: `${resetKey ?? ''}|${artists.length}|${resolvedPageSize}`,
    }
  );

  const visible = isDesktop && paginate ? pagination.items : artists;

  // Determine the batch size based on the view
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
    getTitle: (a) => a.name ?? 'Unknown',
    getSubtitle: (a) => `${a.tracks_count ?? 0} clips`,
    getImage: (a) => a.image ?? null,
    getFallbackLetter: (a) => (a.name ?? '?').charAt(0).toUpperCase(),
    emptyMessage: "No artists match the selected genres.",
    initialCount: 8,
    view,
    renderHeart: (a) => {
      const active = isArtistFavorite(a.id);
      return (
        <HeartButton
          active={active}
          onClick={async () => {
            try {
              await toggleArtist(a.id);
              if (active) onUnfavorited?.(a.id);
            } catch {}
          }}
        />
      );
    },
  };

  return (
    <div className="space-y-3">
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
            resetKey={`${resetKey ?? ''}|${paginate ? pagination.page : 0}`}
            paginated={paginate}
          />
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
                <TileGrid
                  {...tileGridProps}
                  items={batch}
                  resetKey={`mobile-batch-${batchIndex}`}
                  paginated={false}
                  // Dynamic grid classes based on view type
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