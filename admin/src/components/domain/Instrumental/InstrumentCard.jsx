// admin/src/components/domain/InstrumentCard.jsx
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

/**
 * One row per track.
 *
 *   Artist · Track Name                    [ Album ]
 *   [🎵 middle ▶ ✕]  [🎵 custom ▶ ✕]        [Delete track]
 *
 * `onPlay(seg, url)` — called with the segment name and URL when the ▶ is clicked.
 * `onDeleteSegment(seg)` — called with { id, position } when ✕ is clicked.
 * `onDeleteTrack()` — called when "Delete track" is clicked.
 * `playingSeg` — 'middle' | 'custom' | null; highlights the active segment.
 */
export function InstrumentCard({
  track,
  artistName,
  playingSeg,
  onPlay,
  onDeleteSegment,
  onDeleteTrack,
  pendingIds,
}) {
  const segments = ['middle', 'custom'].map(pos => ({
    position: pos,
    row: track.segments[pos],
  }));

  return (
    <Card>
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-subtle truncate" dir="auto">
              {artistName}
            </p>
            <p className="text-sm font-medium text-ink truncate" dir="auto">
              {track.trackName}
            </p>
            {track.albumName && (
              <p className="text-xs text-ink-muted truncate mt-0.5" dir="auto">
                {track.albumName}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteTrack}
            disabled={
              segments.every(s => !s.row) ||
              segments.some(s => s.row && pendingIds.has(s.row.id))
            }
            className="text-danger hover:bg-danger/10 shrink-0"
            title="Delete all segments for this track"
          >
            Delete track
          </Button>
        </div>

        {/* Segments */}
        <div className="flex flex-wrap gap-2">
          {segments.map(({ position, row }) => {
            if (!row) {
              return (
                <span
                  key={position}
                  className="text-xs px-3 py-1.5 rounded-md border border-surface-border text-ink-subtle"
                >
                  {position} — not uploaded
                </span>
              );
            }
            const isPlaying = playingSeg === position;
            const isPending = pendingIds.has(row.id);

            const serveUrl =
              `/api/cloudflare/remote/instrumentals/serve` +
              `?key=${encodeURIComponent(row.r2_key)}`;

            return (
              <span
                key={position}
                className={[
                  'flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors',
                  isPlaying
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-surface-border bg-surface-subtle',
                  isPending ? 'opacity-50' : '',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => onPlay(position, serveUrl)}
                  disabled={isPending}
                  className="text-ink-muted hover:text-brand-500 transition-colors"
                  title={isPlaying ? 'Stop' : 'Play'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span className="text-ink font-medium">{position}</span>
                <button
                  type="button"
                  onClick={() => onDeleteSegment(row)}
                  disabled={isPending}
                  className="text-ink-subtle hover:text-danger transition-colors"
                  title={`Delete the ${position} segment`}
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </Card>
  );
}