// src/components/domain/LyricsArtistSection.jsx
import { useState } from 'react';
import { Card } from '../ui/Card';
import { LyricsCard } from './LyricsCard';

/**
 * One collapsible section per artist, listing all their lyrics rows.
 * Section shape: { artistId, artistName, rows: [...] }
 */
export function LyricsArtistSection({
  section,
  onEdit,
  onPreview,
  onDelete,
  removingId,
}) {
  const [open, setOpen] = useState(true);
  const total = section.rows.length;
  const withLyrics = section.rows.filter(r => r.lyrics && r.lyrics.length > 0).length;

  return (
    <Card className="p-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink truncate">
            {section.artistName}
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            {withLyrics} with lyrics · {total - withLyrics} without
          </p>
        </div>
        <span className="text-ink-subtle text-sm shrink-0 select-none">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {section.rows.map(row => (
            <LyricsCard
              key={row.id}
              row={row}
              onEdit={onEdit}
              onPreview={onPreview}
              onDelete={onDelete}
              isRemoving={removingId === row.id}
            />
          ))}
        </div>
      )}
    </Card>
  );
}