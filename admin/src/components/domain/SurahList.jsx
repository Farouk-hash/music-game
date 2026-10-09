// src/components/domain/SurahList.jsx
import { SurahRow } from './SurahRow';
import { EmptyState } from '../ui/EmptyState';

export function SurahList({
  surahs,
  onPlay,
  selectable = true,
  selectedIds,
  onToggleSelect,
  playingId = null,
  showMoshaf = true,
  clipCounts,                     // ← NEW: Map<string, number>
}) {
  if (!surahs?.length) {
    return (
      <EmptyState
        icon="📖"
        title="No surahs available"
        description="This reciter has no surahs listed."
      />
    );
  }

  return (
    <ul className="divide-y divide-surface-border">
      {surahs.map(surah => {
        // Lookup key = what the clip was saved as.
        // For quran clips, that's the surah's displayName.
        const key = surah.displayName || surah.name;
        const count = clipCounts?.get(key) ?? 0;

        return (
          <SurahRow
            key={surah.id}
            surah={surah}
            onPlay={onPlay}
            selectable={selectable}
            selected={selectedIds?.has(surah.id) ?? false}
            onToggleSelect={onToggleSelect}
            isPlaying={playingId === surah.id}
            showMoshaf={showMoshaf}
            clipCount={count}
          />
        );
      })}
    </ul>
  );
}