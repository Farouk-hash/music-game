// src/components/domain/LyricsCard.jsx
import { Button } from '../ui/Button';

/**
 * One row of lyrics. Renders a track name + status badge + action buttons.
 * Row shape: { id, artist_id, track_name, lyrics, char_count }
 */
export function LyricsCard({ row, onEdit, onPreview, onDelete, isRemoving }) {
  const hasLyrics = !!(row.lyrics && row.lyrics.length > 0);
  const lineCount = hasLyrics ? row.lyrics.split('\n').filter(Boolean).length : 0;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted p-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-medium text-ink truncate" title={row.track_name}>
            {row.track_name}
          </h4>
          <p className="text-xs text-ink-muted mt-0.5">{row.artist_name}</p>
          <span
            className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
              hasLyrics
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-surface-subtle text-ink-subtle'
            }`}
          >
            {hasLyrics ? 'Has lyrics' : 'No lyrics'}
          </span>
        </div>
        {hasLyrics && (
          <p className="text-xs text-ink-subtle mt-0.5 tabular-nums">
            {row.char_count ?? row.lyrics.length} chars · {lineCount} lines
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {hasLyrics && (
          <Button size="sm" variant="ghost" onClick={() => onPreview(row)}>
            Preview
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => onEdit(row)}>
          {hasLyrics ? 'Edit' : 'Add'}
        </Button>
        {hasLyrics && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(row)}
            disabled={isRemoving}
            className="text-danger hover:bg-danger/10"
          >
            {isRemoving ? '…' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  );
}