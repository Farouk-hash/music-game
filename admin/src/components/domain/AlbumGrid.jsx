// src/components/domain/AlbumGrid.jsx
import { AlbumCard } from './AlbumCard';

export function AlbumGrid({
  albums,
  artistSlug,
  selectable = false,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {albums.map(album => (
        <AlbumCard
          key={album.id}
          album={album}
          artistSlug={artistSlug}
          selectable={selectable}
          selected={selectedIds?.has(album.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}