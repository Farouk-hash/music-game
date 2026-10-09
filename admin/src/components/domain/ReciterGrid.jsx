// src/components/domain/ReciterGrid.jsx
import { ReciterCard } from './ReciterCard';

export function ReciterGrid({
  reciters,
  publishedNames,
  pendingIds,
  onPublish,
  onDelete,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
       {reciters.map(r => (
        <ReciterCard
          key={r.id}
          reciter={r}
          isPublished={publishedNames?.has(r.name) ?? false}
          isPending={pendingIds?.has(r.id) ?? false}
          onPublish={onPublish}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}