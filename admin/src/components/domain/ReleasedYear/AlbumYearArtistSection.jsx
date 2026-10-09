// src/components/domain/AlbumYearArtistSection.jsx
import { useState } from 'react';
import { AlbumYearRow } from './AlbumYearRow';
import { Badge } from '../../ui/Badge';

export function AlbumYearArtistSection({ section, onEdit, onDelete, removingId }) {
  const [open, setOpen] = useState(true);
  const { artistId, artistName, rows } = section;

  const minYear = rows.length > 0 ? Math.min(...rows.map(r => r.released_year)) : null;
  const maxYear = rows.length > 0 ? Math.max(...rows.map(r => r.released_year)) : null;
  const range   = minYear === maxYear ? `${minYear}` : `${minYear}–${maxYear}`;

  return (
    <section className="rounded-lg border border-surface-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-subtle transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-ink-subtle text-sm">{open ? '▾' : '▸'}</span>
          <h2 className="text-base font-semibold text-ink truncate">
            {artistName}
          </h2>
          <span className="text-xs text-ink-subtle">#{artistId}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="neutral">{rows.length} albums</Badge>
          {range && <Badge variant="neutral">{range}</Badge>}
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-border divide-y divide-surface-border">
          {rows.map(row => (
            <AlbumYearRow
              key={row.id}
              row={row}
              onEdit={onEdit}
              onDelete={onDelete}
              removing={removingId === row.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}