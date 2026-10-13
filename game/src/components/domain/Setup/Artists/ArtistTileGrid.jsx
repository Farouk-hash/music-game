// game/src/components/domain/Setup/Artists/ArtistTileGrid.jsx
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '../../../../hooks/setup/useFavoriteToggles.js';

export function ArtistTileGrid({
  artists,
  selectedIds,
  onToggle,
  resetKey,
  onUnfavorited,
}) {
  const { isArtistFavorite, toggleArtist } = useFavoriteToggles();

  return (
    <TileGrid
      items={artists}
      selectedIds={selectedIds}
      onToggle={onToggle}
      getTitle={(a) => a.name}
      getSubtitle={(a) => `${a.tracks_count ?? 0} clips`}
      getImage={(a) => a.image}
      emptyMessage="No artists match the selected genres."
      initialCount={8}
      resetKey={resetKey}
      renderHeart={(a) => {
        const active = isArtistFavorite(a.id);
        return (
          <HeartButton
            active={active}
            onClick={async () => {
              try {
                await toggleArtist(a.id);
                if (active) onUnfavorited?.(a.id);
              } catch {
                // ignore
              }
            }}
          />
        );
      }}
    />
  );
}