// src/components/domain/ArtistCard.jsx
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Spinner } from '../ui/Spinner';
import { mediaUrl, formatNumber } from '../../lib/format';

/** Compute the destination for the "View" action based on the artist's source. */
function viewHrefFor(artist, fallbackHref) {
  const source = artist.source ?? 'matb3aa';
  if (source === 'albumaty') return '/published/albumaty';
  if (source === 'mp3quran') return `/quran/${artist.id}`;
  return fallbackHref;
}

export function ArtistCard({
  artist,
  isSynced = false,
  isPending = false,
  isCustomized = false,
  onEdit,
  onDelete,
  detailPath = '/artists',
  detailHref: detailHrefProp,
  publishable = true,
  clipCount = null,

  // Bulk selection
  selectable = false,
  selected = false,
  onToggleSelect,
}) {
  const imageUrl = mediaUrl(artist.image_small ?? artist.image);
  const showPublishButton = publishable && Boolean(onEdit);
  const hasDetailPage = !isCustomized;

  const detailHref = detailHrefProp
    ?? (artist.wp_slug
      ? `${detailPath}/${encodeURIComponent(artist.wp_slug)}`
      : `${detailPath}/${artist.id}`);

  // Route by source: albumaty → albumaty page, mp3quran → quran detail,
  // anything else → the computed detail href.
  const resolvedViewHref = viewHrefFor(artist, detailHref);

  function handleToggleSelect(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onToggleSelect?.(artist);
  }

  function handleEdit(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onEdit?.(artist);
  }

  const bodyInner = (
    <>
      <div className="aspect-square bg-surface-subtle flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span
          className={`text-4xl font-bold text-brand-500 ${imageUrl ? 'hidden' : ''}`}
          aria-hidden="true"
        >
          {artist.name.charAt(0)}
        </span>
      </div>

      <div className="p-3 text-center border-t border-surface-border">
        <p className="font-medium text-ink truncate" title={artist.name}>
          {artist.name}
        </p>

        <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
          {clipCount != null && clipCount > 0 && (
            <span className="text-xs text-ink-muted">
              {formatNumber(clipCount)}🎶
            </span>
          )}

          {artist.source && (
            <span
              className={`
                text-[10px] px-1.5 py-0.5 rounded
                ${artist.source === 'albumaty'
                  ? 'bg-brand-500/15 text-brand-400'
                  : artist.source === 'mp3quran'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-surface-subtle text-ink-subtle'}
              `}
              title={`Source: ${artist.source}`}
            >
              {artist.source}
            </span>
          )}

          {isCustomized ? (
            <span className="text-xs text-brand-400">✎ Customized</span>
          ) : isSynced ? (
            <span className="text-xs text-emerald-500">✓ Synced</span>
          ) : null}
        </div>
      </div>
    </>
  );

  const showFooter = selectable || showPublishButton || hasDetailPage;

  return (
    <Card
      hover
      className={`
        overflow-hidden group relative transition-colors flex flex-col
        ${selected ? 'ring-2 ring-brand-500 border-brand-500' : ''}
        ${!selected && isCustomized
          ? 'border-brand-400/50 bg-brand-500/5'
          : !selected && isSynced
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : ''}
      `}
    >
      {selectable && (
        <div className="absolute top-2 right-2 z-20">
          <div className="w-7 h-7 rounded-md bg-surface/80 backdrop-blur-sm flex items-center justify-center">
            <Checkbox
              checked={selected}
              onChange={handleToggleSelect}
              size="md"
            />
          </div>
        </div>
      )}

      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 pointer-events-none">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-md bg-surface/80 backdrop-blur-sm pointer-events-auto"
          title={isSynced ? 'Published to Cloudflare' : 'Not published'}
        >
          <Checkbox checked={isSynced} disabled size="md" />
        </div>

        {isSynced && onDelete && (
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(artist);
            }}
            disabled={isPending}
            aria-label={`Remove "${artist.name}" from Cloudflare`}
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
        <div className="absolute inset-0 z-30 bg-surface/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <Spinner size="md" className="text-brand-500" />
        </div>
      )}

      {selectable ? (
        <button
          type="button"
          onClick={handleToggleSelect}
          className="block w-full text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={selected ? `Deselect ${artist.name}` : `Select ${artist.name}`}
          aria-pressed={selected}
        >
          {bodyInner}
        </button>
      ) : !hasDetailPage && showPublishButton ? (
        <button
          type="button"
          onClick={() => onEdit?.(artist)}
          className="block w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={`Manage ${artist.name}`}
        >
          {bodyInner}
        </button>
      ) : (
        <Link
          to={resolvedViewHref}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={`${artist.name} — view tracks`}
        >
          {bodyInner}
        </Link>
      )}

      {showFooter && (
        <div className="border-t border-surface-border flex items-stretch mt-auto">
          {selectable && (
            <button
              type="button"
              onClick={handleToggleSelect}
              className={`
                flex-1 py-2 text-xs text-ink-muted
                hover:text-brand-500 hover:bg-surface-subtle
                transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
                ${(showPublishButton || hasDetailPage) ? 'border-r border-surface-border' : ''}
              `}
              aria-label={`Toggle selection for ${artist.name}`}
            >
              {selected ? 'Deselect' : 'Select'}
            </button>
          )}

          {showPublishButton && (
            <button
              type="button"
              onClick={handleEdit}
              disabled={isPending}
              className={`
                flex-1 py-2 text-xs text-ink-muted
                hover:text-brand-500 hover:bg-surface-subtle
                transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
                disabled:opacity-50 disabled:cursor-not-allowed
                ${hasDetailPage ? 'border-r border-surface-border' : ''}
              `}
              aria-label={`Manage ${artist.name} in Cloudflare`}
            >
              {isSynced ? 'Edit' : 'Publish'}
            </button>
          )}

          {hasDetailPage && (
            <Link
              to={resolvedViewHref}
              onClick={e => e.stopPropagation()}
              className="
                flex-1 py-2 text-xs text-ink-muted text-center
                hover:text-brand-500 hover:bg-surface-subtle
                transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
              "
              aria-label={`${artist.name} — view tracks`}
            >
              View
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}