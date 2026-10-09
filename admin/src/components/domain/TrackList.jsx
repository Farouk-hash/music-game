// src/components/domain/TrackList.jsx
import { TrackRow } from './TrackRow';
import { EmptyState } from '../ui/EmptyState';
import { SelectAllToggle } from '../ui/SelectAllToggle';

export function TrackList({
  tracks,
  onPlay,
  emptyMessage = 'No tracks available.',
  selectable = false,
  selectedIds,
  onToggleSelect,
  onSelectAll,        // ← NEW: receives a new Set<number>
  clipCounts,
}) {
  if (!tracks?.length) {
    return (
      <EmptyState
        icon="🎵"
        title="Nothing here"
        description={emptyMessage}
      />
    );
  }

  const trackIds = tracks.map(t => t.id);
  const selectedCount = selectable && selectedIds
    ? tracks.filter(t => selectedIds.has(t.id)).length
    : 0;

  return (
    <div>
      {selectable && onSelectAll && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border">
          <span className="text-xs text-ink-subtle">
            {selectedCount > 0
              ? `${selectedCount} of ${tracks.length} selected`
              : `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
          </span>
          <SelectAllToggle
            ids={trackIds}
            selectedIds={selectedIds ?? new Set()}
            onChange={onSelectAll}
          />
        </div>
      )}

      <ul className="divide-y divide-surface-border">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            onPlay={onPlay}
            selectable={selectable}
            selected={selectedIds?.has(track.id) ?? false}
            onToggleSelect={onToggleSelect}
            clipCount={clipCounts?.get(track.name) ?? 0}
          />
        ))}
      </ul>
    </div>
  );
}