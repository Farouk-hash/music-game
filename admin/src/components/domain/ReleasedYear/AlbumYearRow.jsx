// src/components/domain/AlbumYearRow.jsx
import { Badge } from '../../ui/Badge';

export function AlbumYearRow({ row, onEdit, onDelete, removing }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-surface-subtle transition-colors">
      <div className="w-16 shrink-0">
        <Badge variant="neutral">{row.released_year}</Badge>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink truncate" dir="auto">
          {row.album_name}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="px-3 py-1.5 text-xs rounded-md text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          disabled={removing}
          className="px-3 py-1.5 text-xs rounded-md text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          {removing ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}