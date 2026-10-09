// src/components/domain/GenreCard.jsx
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Spinner } from '../ui/Spinner';

export function GenreCard({
  genre,
  isSynced = false,
  isPending = false,
  isCustomized = false,
  onToggleSync,
  onDelete,
  onEdit,
}) {
  // Show detail link (artist list) only for non-custom genres
  const hasDetailPage = !isCustomized;
  const detailHref = `/genres/${encodeURIComponent(genre.name)}`;

  const bodyInner = (
    <>
      <div className="aspect-square bg-surface-subtle flex items-center justify-center overflow-hidden">
        {genre.image ? (
          <img
            src={genre.image}
            alt={genre.display_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true">
            🎵
          </span>
        )}
      </div>

      <div className="p-3 text-center border-t border-surface-border">
        <p className="font-medium text-ink truncate" title={genre.display_name}>
          {genre.display_name}
        </p>
        {isCustomized ? (
          <p className="text-xs text-brand-400 mt-0.5">✎ Customized</p>
        ) : isSynced ? (
          <p className="text-xs text-emerald-500 mt-0.5">✓ Synced</p>
        ) : null}
      </div>
    </>
  );

  return (
    <Card
      hover
      className={`
        overflow-hidden group relative transition-colors flex flex-col
        ${isCustomized
          ? 'border-brand-400/50 bg-brand-500/5'
          : isSynced
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : ''}
      `}
    >
      {/* Top-left controls */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 pointer-events-none">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-md bg-surface/80 backdrop-blur-sm pointer-events-auto"
          title={isSynced ? 'Published to Cloudflare' : 'Not published'}
        >
          <Checkbox
            checked={isSynced}
            disabled={isPending || isSynced}
            onChange={() => onToggleSync?.(genre, isSynced)}
            size="md"
          />
        </div>

        {isSynced && onDelete && (
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(genre);
            }}
            disabled={isPending}
            aria-label={`Delete "${genre.display_name}" from Cloudflare`}
            title="Delete from Cloudflare"
            className="
              w-7 h-7 rounded-md bg-surface/80 backdrop-blur-sm pointer-events-auto
              flex items-center justify-center
              text-ink-muted hover:text-danger hover:bg-surface
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            🗑
          </button>
        )}
      </div>

      {isPending && (
        <div className="absolute inset-0 z-20 bg-surface/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <Spinner size="md" className="text-brand-500" />
        </div>
      )}

      {/* Body — link to artist list if non-custom, button to modal if custom */}
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(genre)}
          className="block w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={`Edit ${genre.display_name}`}
        >
          {bodyInner}
        </button>
      ) : hasDetailPage ? (
        <Link
          to={detailHref}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={`${genre.display_name} — view artists`}
        >
          {bodyInner}
        </Link>
      ) : (
        <div className="block cursor-default">{bodyInner}</div>
      )}

      {/* Footer — only shows in Published page */}
      {onEdit && (
        <div className="border-t border-surface-border flex items-stretch mt-auto">
          <button
            type="button"
            onClick={() => onEdit(genre)}
            disabled={isPending}
            className={`
              flex-1 py-2 text-xs text-ink-muted
              hover:text-brand-500 hover:bg-surface-subtle
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
              disabled:opacity-50 disabled:cursor-not-allowed
              ${hasDetailPage ? 'border-r border-surface-border' : ''}
            `}
            aria-label={`Edit ${genre.display_name}`}
          >
            Edit
          </button>

          {hasDetailPage && (
            <Link
              to={detailHref}
              className="
                flex-1 py-2 text-xs text-ink-muted text-center
                hover:text-brand-500 hover:bg-surface-subtle
                transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
              "
              aria-label={`${genre.display_name} — view artists`}
            >
              View
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}