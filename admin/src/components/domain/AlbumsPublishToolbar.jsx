import { Button } from '../ui/Button';

export function AlbumsPublishToolbar({ count, onClear, onPublish, loading }) {
  if (count === 0) return null;

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-surface-muted border border-brand-500/40 shadow-card">
      <p className="text-sm text-ink">
        <span className="font-medium">{count}</span>{' '}
        {count === 1 ? 'album' : 'albums'} selected
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={loading}>
          Clear
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onPublish}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Loading tracks…' : 'Publish tracks →'}
        </Button>
      </div>
    </div>
  );
}