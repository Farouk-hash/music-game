// game/src/components/game/ArtistTileGrid.jsx
import { TileGrid } from "../../Tile/TileGrid";

export function ArtistTileGrid({
  artists,
  selectedIds,
  onToggle,
  resetKey,
}) {
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
    />
  );
}