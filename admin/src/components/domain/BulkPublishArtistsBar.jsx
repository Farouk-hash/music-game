// admin/src/components/domain/BulkPublishArtistsBar.jsx
import { Button } from '../ui/Button';

export function BulkPublishArtistsBar({
  count,
  onClear,
  onPublish,
  onGenerateInstruments,
  onUploadInstruments,
  disabled = false,
}) {
  if (count === 0) return null;

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-surface-muted border border-brand-500/40 shadow-card">
      <p className="text-sm text-ink">
        <span className="font-medium">{count}</span>{' '}
        {count === 1 ? 'artist' : 'artists'} selected
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        {onGenerateInstruments && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onGenerateInstruments}
            disabled={disabled}
            title="Cut + remove vocals → local MP3s"
          >
            🎼 Generate
          </Button>
        )}
        {onUploadInstruments && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onUploadInstruments}
            disabled={disabled}
            title="Upload local MP3s to R2 + D1"
          >
            ⬆️ Upload
          </Button>
        )}
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