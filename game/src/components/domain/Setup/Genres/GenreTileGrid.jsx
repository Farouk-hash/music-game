// game/src/components/domain/Setup/Genres/GenreTileGrid.jsx
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '@/hooks/setup/useFavoriteToggles.js';
import { useMediaQuery } from '@/hooks/ui/useMediaQuery.js';
import { useSmartPagination } from '@/hooks/ui/useSmartPagination.js';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx';

const PAGE_SIZE_MOBILE = 4;
const PAGE_SIZE_DESKTOP = 10;

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
    paginate ? genres : [],
    {
      pageSize: resolvedPageSize || 9999,
      resetKey: `genres|${genres.length}|${resolvedPageSize}`,
    }
  );

  const visible = paginate ? pagination.items : genres;

  return (
    <div className="space-y-3">
      <Reveal
        key={paginate ? pagination.page : 'all'}
        direction={direction}
        distance={80}
        duration={400}
      >
        <TileGrid
          items={visible}
          selectedIds={selectedIds}
          onToggle={onToggle}
          allSelected={allSelected}
          getTitle={(g) => g.display_name || g.name}
          getImage={(g) => g.image}
          emptyMessage="No genres available."
          initialCount={8}
          view={view}
          paginated={paginate}
          renderHeart={(g) => {
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
          }}
        />
      </Reveal>

      {paginate && <Pagination pagination={pagination} />}
    </div>
  );
}