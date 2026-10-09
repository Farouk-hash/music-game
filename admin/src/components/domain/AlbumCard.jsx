// src/components/domain/AlbumCard.jsx
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { mediaUrl, formatNumber } from '../../lib/format';

export function AlbumCard({
  album,
  artistSlug,
  selectable = false,
  selected = false,
  onToggleSelect,
}) {
  const coverUrl = mediaUrl(album.image ?? album.cover ?? album.image_small);
  const displayTitle = album.name || album.title || 'Untitled album';
  const year = album.release_date?.slice(0, 4) || album.year || '';

  const detailHref = `/albums/${album.id}`;
  const detailState = artistSlug
    ? { from: `/artists/${artistSlug}`, fromLabel: 'Back to artist' }
    : undefined;

  function handleToggle(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onToggleSelect?.(album.id);
  }

  return (
    <Card
      hover
      className={`
        overflow-hidden group relative transition-colors flex flex-col
        ${selected ? 'ring-2 ring-brand-500 border-brand-500' : ''}
      `}
    >
      {/* Checkbox (only when selectable) */}
      {selectable && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-7 h-7 rounded-md bg-surface/80 backdrop-blur-sm flex items-center justify-center">
            <Checkbox
              checked={selected}
              onChange={handleToggle}
              size="md"
            />
          </div>
        </div>
      )}

      {/* Body — button when selectable, link otherwise */}
      {selectable ? (
        <button
          type="button"
          onClick={handleToggle}
          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={`Select ${displayTitle}`}
        >
          <AlbumCardCover coverUrl={coverUrl} displayTitle={displayTitle} />
        </button>
      ) : (
        <Link
          to={detailHref}
          state={detailState}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label={`${displayTitle}${year ? ` (${year})` : ''}`}
        >
          <AlbumCardCover coverUrl={coverUrl} displayTitle={displayTitle} />
        </Link>
      )}

      {/* Footer: title, year, tracks count */}
      <div className="p-3 border-t border-surface-border flex-1">
        <p className="font-medium text-ink text-sm truncate" title={displayTitle}>
          {displayTitle}
        </p>
        <div className="flex items-center justify-between text-xs text-ink-muted mt-1">
          {year && <span>{year}</span>}
          {album.tracks_count != null && (
            <span>{formatNumber(album.tracks_count)} tracks</span>
          )}
        </div>
      </div>

      {/* Action footer — always present, gives "View" even in select mode */}
      <div className="border-t border-surface-border flex items-stretch">
        {selectable ? (
          <button
            type="button"
            onClick={handleToggle}
            className="
              flex-1 py-2 text-xs text-ink-muted
              hover:text-brand-500 hover:bg-surface-subtle
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
              border-r border-surface-border
            "
            aria-label={`Toggle selection for ${displayTitle}`}
          >
            {selected ? 'Deselect' : 'Select'}
          </button>
        ) : null}

        <Link
          to={detailHref}
          state={detailState}
          onClick={e => e.stopPropagation()}
          className="
            flex-1 py-2 text-xs text-ink-muted text-center
            hover:text-brand-500 hover:bg-surface-subtle
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset
          "
          aria-label={`${displayTitle} — view album`}
        >
          View →
        </Link>
      </div>
    </Card>
  );
}

function AlbumCardCover({ coverUrl, displayTitle }) {
  return (
    <div className="aspect-square bg-surface-subtle overflow-hidden flex items-center justify-center">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={displayTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={e => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <span
        className={`text-4xl ${coverUrl ? 'hidden' : ''}`}
        aria-hidden="true"
      >
        💿
      </span>
    </div>
  );
}