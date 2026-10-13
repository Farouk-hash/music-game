// game/src/components/domain/Setup/Genres/GenreTileGrid.jsx
import { TileGrid } from '../../Tile/TileGrid.jsx';
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '../../../../hooks/setup/useFavoriteToggles.js';

export function GenreTileGrid({
  genres,
  selectedIds,
  onToggle,
  allSelected = false,
  onUnfavorited,
}) {
  const { isGenreFavorite, toggleGenre } = useFavoriteToggles();

  return (
    <TileGrid
      items={genres}
      selectedIds={selectedIds}
      onToggle={onToggle}
      allSelected={allSelected}
      getTitle={(g) => g.display_name || g.name}
      getImage={(g) => g.image}
      emptyMessage="No genres available."
      initialCount={8}
      renderHeart={(g) => {
        const active = isGenreFavorite(g.id);
        return (
          <HeartButton
            active={active}
            onClick={async () => {
              try {
                await toggleGenre(g.id);
                // Only call the unfavorite callback when we actually
                // removed the favourite. Selection stays untouched
                // when the user adds a new favourite.
                if (active) onUnfavorited?.(g.id);
              } catch {
                // Toggle failed — leave selection untouched.
              }
            }}
          />
        );
      }}
    />
  );
}