// src/components/domain/TrackClipsCard.jsx
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { ClipRow } from './ClipRow';

/**
 * One card per (artist, track name) group — with all its rendition rows.
 * Each clip in group.clips is one rendition (forward or reversed) of a slot.
 */
export function TrackClipsCard({
  group,
  playingClipId,
  onPlay,
  onEdit,
  onDelete,
  onDeleteForward,
  onDeleteReversed,
  pendingIds,
}) {
  const artistSlug = group.artistName
    ? encodeURIComponent(group.artistName)
    : null;

  // Count slots (unique rowIds) and renditions separately
  const slotIds = new Set(group.clips.map(c => c.rowId));
  const slotCount = slotIds.size;
  const clipCount = group.clips.length;

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink truncate" title={group.trackName}>
            {group.trackName}
          </h3>
          <p className="text-xs text-ink-muted truncate">
            {artistSlug ? (
              <Link
                to={`/artists/${artistSlug}`}
                className="hover:text-brand-500 transition-colors"
              >
                {group.artistName}
              </Link>
            ) : (
              group.artistName
            )}
          </p>
        </div>

        <span className="text-xs text-ink-subtle shrink-0">
          {slotCount} {slotCount === 1 ? 'track' : 'tracks'} ·{' '}
          {clipCount} {clipCount === 1 ? 'clip' : 'clips'}
        </span>
      </div>

      <div className="space-y-0.5">
        {group.clips.map(clip => (
          <ClipRow
            key={clip.id}
            clip={clip}
            isPlaying={playingClipId === clip.id}
            onPlay={onPlay}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteForward={onDeleteForward}
            onDeleteReversed={onDeleteReversed}
            isPending={pendingIds.has(clip.id)}
          />
        ))}
      </div>
    </Card>
  );
}