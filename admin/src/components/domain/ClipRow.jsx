// src/components/domain/ClipRow.jsx
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { serveUrl } from '../../lib/r2Key';

const POSITION_VARIANTS = {
  start:  'brand',
  middle: 'warning',
  end:    'success',
  custom: 'outline',
};

export function ClipRow({
  clip,
  isPlaying,
  onPlay,
  onEdit,
  onDelete,           // deletes the WHOLE slot (both renditions)
  onDeleteReversed,   // deletes only the reversed rendition
  isPending,
}) {
  const cfBase = import.meta.env.VITE_CF_BASE;
  const url = serveUrl(cfBase, clip.r2_key);

  const durationLabel = clip.durationSec != null ? `${clip.durationSec}s` : null;
  const variant = POSITION_VARIANTS[clip.position] ?? 'default';
  const isRev = clip.rendition === 'reversed';

  return (
    <div className={`
      flex items-center gap-2 py-1.5 px-2 rounded
      transition-colors
      ${isPlaying ? 'bg-brand-500/10' : 'hover:bg-surface-subtle'}
    `}>
      {/* Play button */}
      <button
        type="button"
        onClick={() => onPlay?.(clip, url)}
        disabled={!url}
        aria-label={`Play ${isRev ? 'reversed' : 'forward'} ${clip.position} clip`}
        className={`
          w-7 h-7 shrink-0 rounded-full
          flex items-center justify-center
          transition-colors
          ${isPlaying
            ? 'bg-brand-500 text-white'
            : 'bg-surface-subtle text-ink-muted hover:bg-brand-500 hover:text-white'}
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {isPlaying ? (
          <span aria-hidden="true" className="text-xs">■</span>
        ) : (
          <span aria-hidden="true" className="text-xs">▶</span>
        )}
      </button>

      {/* Rendition badge — NEW */}
      <span
        className={`
          text-[10px] font-medium shrink-0 tabular-nums
          px-1.5 py-0.5 rounded uppercase tracking-wide
          ${isRev
            ? 'bg-brand-500/15 text-brand-400'
            : 'bg-surface-subtle text-ink-subtle'}
        `}
        title={isRev ? 'Reversed rendition' : 'Forward rendition'}
      >
        {isRev ? '↺ rev' : '→ fwd'}
      </span>

      {/* Position badge */}
      <Badge variant={variant} size="sm">
        {clip.position}
      </Badge>

      {/* Duration */}
      {durationLabel && (
        <span className="text-xs text-ink-muted tabular-nums w-10">
          {durationLabel}
        </span>
      )}

      {/* Label (if any) */}
      {clip.label && (
        <span className="text-xs text-ink-subtle truncate flex-1">
          {clip.label}
        </span>
      )}

      {clip.album_name && (
        <span
          className="text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded bg-accent-soft text-accent"
          title={`Album: ${clip.album_name}`}
        >
          💿 {clip.album_name}
        </span>
      )}
      
      {clip.featured_artists && (
        <span
          className="text-[10px] font-medium shrink-0 max-w-[140px] truncate px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400"
          title={`Featured: ${clip.featured_artists}`}
        >
          👥 {clip.featured_artists}
        </span>
      )}
      {/* Push controls right */}
      <div className="flex-1" />

      {/* Delete reversed rendition — only on the reversed row */}
      {isRev && onDeleteReversed && (
        <button
          type="button"
          onClick={() => onDeleteReversed(clip)}
          disabled={isPending}
          aria-label="Delete reversed rendition"
          title="Delete only the reversed clip"
          className="
            h-7 px-2 rounded flex items-center gap-1 text-xs text-ink-muted
            hover:text-danger hover:bg-surface-subtle
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          ✕ <span>rev</span>
        </button>
      )}

      {/* Edit */}
      <button
        type="button"
        onClick={() => onEdit?.(clip)}
        disabled={isPending}
        aria-label="Edit clip"
        title="Edit metadata"
        className="
          w-7 h-7 rounded flex items-center justify-center text-ink-muted
          hover:text-brand-500 hover:bg-surface-subtle
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        ✎
      </button>

      {/* Delete whole slot */}
      <button
        type="button"
        onClick={() => onDelete?.(clip)}
        disabled={isPending}
        aria-label="Delete slot"
        title="Delete both renditions of this slot"
        className="
          w-7 h-7 rounded flex items-center justify-center text-ink-muted
          hover:text-danger hover:bg-surface-subtle
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        🗑
      </button>

      {/* Pending spinner overlay */}
      {isPending && (
        <Spinner size="sm" className="text-brand-500 shrink-0" />
      )}
    </div>
  );
}