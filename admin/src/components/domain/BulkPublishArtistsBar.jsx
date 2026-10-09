// admin/src/components/domain/BulkPublishArtistsBar.jsx
import { Button } from '../ui/Button';

export function BulkPublishArtistsBar({
  count,
  onClear,
  onPublish,
  disabled = false,
}) {
  if (count === 0) return null;

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-surface-muted border border-brand-500/40 shadow-card">
      <p className="text-sm text-ink">
        <span className="font-medium">{count}</span>{' '}
        {count === 1 ? 'artist' : 'artists'} selected
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onPublish}
          disabled={disabled}
        >
          Publish all clips →
        </Button>
      </div>
    </div>
  );
}