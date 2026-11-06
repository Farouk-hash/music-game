// game/src/components/domain/Setup/Artists/ArtistTileGrid.jsx
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '@/hooks/setup/useFavoriteToggles.js';
import { useMediaQuery } from '@/hooks/ui/useMediaQuery.js';
import { useSmartPagination } from '@/hooks/ui/useSmartPagination.js';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx';

const PAGE_SIZE_MOBILE = 10;
const PAGE_SIZE_DESKTOP = 15;

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
    paginate ? artists : [],
    {
      pageSize: resolvedPageSize || 9999,
      resetKey: `${resetKey ?? ''}|${artists.length}|${resolvedPageSize}`,
    }
  );

  const visible = paginate ? pagination.items : artists;

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
          getTitle={(a) => a.name ?? 'Unknown'}
          getSubtitle={(a) => `${a.tracks_count ?? 0} clips`}
          getImage={(a) => a.image ?? null}
          getFallbackLetter={(a) => (a.name ?? '?').charAt(0).toUpperCase()}
          emptyMessage="No artists match the selected genres."
          initialCount={8}
          resetKey={`${resetKey ?? ''}|${paginate ? pagination.page : 0}`}
          view={view}
          paginated={paginate}
          renderHeart={(a) => {
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
          }}
        />
      </Reveal>

      {paginate && <Pagination pagination={pagination} />}
    </div>
  );
}