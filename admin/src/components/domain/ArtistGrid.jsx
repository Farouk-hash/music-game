// src/components/domain/ArtistGrid.jsx
import { ArtistCard } from './ArtistCard';

export function ArtistGrid({
  artists,
  syncedIds,
  pendingIds,
  onDelete,
  onEdit,
  detailPath = '/artists',
  publishable = true,
  detailHrefFor,
  selectable = false,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {artists.map(artist => (
        <ArtistCard
          key={artist.id}
          artist={artist}
          isSynced={syncedIds?.has(artist.id) ?? false}
          isPending={pendingIds?.has(artist.id) ?? false}
          isCustomized={artist.is_customized === true}
          onDelete={onDelete}
          onEdit={onEdit}
          detailPath={detailPath}
          detailHref={detailHrefFor ? detailHrefFor(artist) : undefined}
          publishable={publishable}
          clipCount={artist.tracks_count}
          instrumentCount={artist.instruments_count}   
          selectable={selectable}
          selected={selectedIds?.has(artist.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}