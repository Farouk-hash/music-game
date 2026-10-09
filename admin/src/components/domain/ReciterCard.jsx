// src/components/domain/ReciterCard.jsx
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

export function ReciterCard({
  reciter,
  isPublished = false,
  isPending = false,
  onPublish,
  onDelete,
}) {
  const initial = reciter.letter || reciter.name?.charAt(0) || '؟';

  return (
    <Card
      hover
      className={`
        relative overflow-hidden group flex flex-col
        ${isPublished ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
      `}
    >
      {/* Top-right: trash (only when published) */}
      {isPublished && onDelete && (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(reciter);
            }}
            disabled={isPending}
            aria-label={`Remove "${reciter.name}" from Cloudflare`}
            title="Delete from Cloudflare"
            className="
              w-7 h-7 rounded-md bg-surface/80 backdrop-blur-sm
              flex items-center justify-center
              text-ink-muted hover:text-danger hover:bg-surface
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            🗑
          </button>
        </div>
      )}

      {isPending && (
        <div className="absolute inset-0 z-20 bg-surface/60 backdrop-blur-sm flex items-center justify-center">
          <Spinner size="md" className="text-brand-500" />
        </div>
      )}

      {/* Body — link to /quran/:id */}
      <Link
        to={`/quran/${reciter.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        aria-label={`${reciter.name} — view surahs`}
      >
        <div className="aspect-square bg-surface-subtle flex items-center justify-center overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-5xl font-bold select-none group-hover:scale-105 transition-transform duration-300">
            {initial}
          </div>
        </div>

        <div className="p-3 text-center border-t border-surface-border">
          <p className="font-medium text-ink truncate" title={reciter.name}>
            {reciter.name}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {reciter.surahCount} {reciter.surahCount === 1 ? 'surah' : 'surahs'}
          </p>
          {isPublished && (
            <p className="text-xs text-emerald-500 mt-0.5">✓ Published</p>
          )}
        </div>
      </Link>

      {/* Footer: View + Publish/Edit */}
      <div className="border-t border-surface-border flex items-stretch mt-auto">
        <Link
          to={`/quran/${reciter.id}`}
          className="
            flex-1 py-2 text-xs text-ink-muted text-center
            hover:text-brand-500 hover:bg-surface-subtle
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
            border-r border-surface-border
          "
          aria-label={`${reciter.name} — view surahs`}
        >
          View
        </Link>

        {onPublish && (
          <button
            type="button"
            onClick={() => onPublish(reciter)}
            disabled={isPending}
            className="
              flex-1 py-2 text-xs text-ink-muted
              hover:text-brand-500 hover:bg-surface-subtle
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label={`${isPublished ? 'Edit' : 'Publish'} ${reciter.name}`}
          >
            {isPublished ? 'Edit' : 'Publish'}
          </button>
        )}
      </div>
    </Card>
  );
}