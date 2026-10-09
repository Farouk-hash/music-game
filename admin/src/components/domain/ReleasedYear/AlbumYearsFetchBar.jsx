// src/components/domain/AlbumYearsFetchBar.jsx
import { Button } from '../../ui/Button';

/**
 * Launch bar for the album-years batch pipeline.
 * The bar itself is minimal — the modal does the picking.
 */
export function AlbumYearsFetchBar({ onOpen, disabled, starting }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-ink">Batch fetch album years</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Pick artists and albums; the pipeline resolves years from matb3aa and albumaty.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onOpen}
          disabled={disabled || starting}
          loading={starting}
        >
          {starting ? 'Starting…' : 'Fetch album years'}
        </Button>
      </div>
      {disabled && (
        <p className="text-xs text-warning mt-2">
          A pipeline job is already running. Cancel it before starting a new one.
        </p>
      )}
    </div>
  );
}