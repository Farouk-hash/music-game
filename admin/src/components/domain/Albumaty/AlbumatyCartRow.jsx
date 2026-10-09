// admin/src/components/domain/AlbumatyCartRow.jsx
import { useState } from 'react';
import { Button } from '../../ui/Button';
import { AlbumatyTrackPicker } from './AlbumatyTrackPicker';
import { GenreMultiSelect } from './GenreMultiSelect';

export function AlbumatyCartRow({
  item,
  genres,
  onCrawl,
  onRemove,
  onUpdate,
  isPublished = false,
}) {
  const [open, setOpen] = useState(false);

  const state = item.crawlStatus;
  const totalTracks =
    (item.albums ?? []).reduce((n, a) => n + a.songs.length, 0) +
    (item.singles?.length ?? 0);
  const selectedTracks =
    (item.albums ?? []).reduce(
      (n, a) => n + a.songs.filter(s => s.selected).length,
      0
    ) + (item.singles ?? []).filter(s => s.selected).length;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-10 h-10 rounded-full object-cover border border-surface-border shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-subtle border border-surface-border flex items-center justify-center text-ink-subtle text-xs shrink-0 mt-0.5">
            {item.name?.[0] ?? '?'}
            {isPublished && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 align-middle">
                  published
                </span>
              )}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-ink truncate">{item.name}</p>
            <p className="text-[10px] text-ink-subtle">
              albumaty #{item.albumatyId}
              {state === 'crawled' && (
                <>
                  {' · '}
                  {item.albums.length} album{item.albums.length === 1 ? '' : 's'}
                  {' · '}
                  {totalTracks} track{totalTracks === 1 ? '' : 's'}
                  {selectedTracks > 0 && (
                    <>
                      {' · '}
                      <span className="text-brand-400">{selectedTracks} selected</span>
                    </>
                  )}
                </>
              )}
            </p>
            {state === 'error' && (
              <p className="text-[10px] text-danger truncate" title={item.crawlError}>
                Crawl failed: {item.crawlError}
              </p>
            )}
          </div>

          {/* Genre multi-select */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-ink-subtle shrink-0">Genres:</span>
            <GenreMultiSelect
              genres={genres}
              value={item.genre_ids ?? []}
              onChange={next => onUpdate(item.albumatyId, { genre_ids: next })}
              placeholder="Pick genres…"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {state === 'idle' && (
            <Button size="sm" variant="secondary" onClick={() => onCrawl(item.albumatyId)}>
              Crawl
            </Button>
          )}
          {state === 'crawling' && (
            <span className="text-xs text-ink-muted px-2 animate-pulse">Crawling…</span>
          )}
          {state === 'crawled' && (
            <Button size="sm" variant="ghost" onClick={() => setOpen(o => !o)}>
              {open ? 'Hide' : 'Select'}
            </Button>
          )}
          {state === 'error' && (
            <Button size="sm" variant="secondary" onClick={() => onCrawl(item.albumatyId)}>
              Retry
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(item.albumatyId)}
            className="text-danger hover:bg-danger/10"
          >
            ✕
          </Button>
        </div>
      </div>

      {open && state === 'crawled' && (
        <div className="border-t border-surface-border p-3 bg-surface">
          <AlbumatyTrackPicker
            item={item}
            onSelectionChange={(next) => onUpdate(item.albumatyId, next)}
          />
        </div>
      )}
    </div>
  );
}