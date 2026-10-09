// src/components/domain/GenreGrid.jsx
import { GenreCard } from './GenreCard';

export function GenreGrid({
  genres,
  syncedIds,
  pendingIds,
  onToggleSync,
  onDelete,
  onEdit,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {genres.map(genre => (
        <GenreCard
          key={genre.id}
          genre={genre}
          isSynced={syncedIds?.has(genre.id) ?? false}
          isPending={pendingIds?.has(genre.id) ?? false}
          isCustomized={genre.is_customized === true}
          onToggleSync={onToggleSync}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}