// src/components/domain/TrackRow.jsx
import { mediaUrl, formatDuration, formatNumber } from '../../lib/format';
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';    

export function TrackRow({
  track,
  index,
  onPlay,
  selectable = false,
  selected = false,
  onToggleSelect,
  clipCount = 0,      
}) {
  const coverUrl = mediaUrl(track.image);
  const audioUrl = track.src ? mediaUrl(track.src) : null;

  function handlePlay(e) {
    e.stopPropagation();
    if (audioUrl) onPlay?.({ ...track, audioUrl });
  }

  function handleToggle(e) {
    e.stopPropagation();
    onToggleSelect?.(track.id);
  }

  return (
    <li className={`
      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group
      ${selected ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : 'hover:bg-surface-subtle'}
    `}>
      {selectable && (
        <Checkbox
          checked={selected}
          onChange={handleToggle}
          className="shrink-0"
        />
      )}

      <button
        type="button"
        onClick={handlePlay}
        disabled={!audioUrl}
        aria-label={`Play ${track.name}`}
        className="
          w-8 h-8 shrink-0 rounded-full
          flex items-center justify-center
          bg-surface-subtle text-ink-muted
          group-hover:bg-brand-500 group-hover:text-white
          transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        {audioUrl ? (
          <span aria-hidden="true" className="text-xs">▶</span>
        ) : (
          <span aria-hidden="true" className="text-xs">{index + 1}</span>
        )}
      </button>

      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          className="w-10 h-10 rounded object-cover shrink-0 bg-surface-subtle"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-ink truncate" title={track.name}>
            {track.name}
          </p>
          {clipCount > 0 && (
            <Badge variant="success" size="sm">
              ✓ {clipCount} {clipCount === 1 ? 'clip' : 'clips'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-ink-muted truncate">
          {track.artists?.map(a => a.name).filter(Boolean).join(', ') || '—'}
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end text-xs text-ink-subtle shrink-0">
        {track.plays != null && <span>{formatNumber(track.plays)} plays</span>}
        {track.download_count != null && (
          <span>{formatNumber(track.download_count)} downloads</span>
        )}
      </div>

      <span className="text-xs text-ink-muted tabular-nums shrink-0 w-12 text-right">
        {formatDuration(track.duration)}
      </span>
    </li>
  );
}