// game/src/components/domain/Setup/Genres/GenreTileGrid.jsx

import { TileGrid } from "../../Tile/TileGrid";

export function GenreTileGrid({
  genres,
  selectedIds,
  onToggle,
  allSelected = false,
}) {
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
    />
  );
}