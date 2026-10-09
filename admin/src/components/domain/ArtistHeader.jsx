import { Badge } from '../ui/Badge';
import { mediaUrl, formatNumber } from '../../lib/format';

export function ArtistHeader({ artist, singlesCount, albumsTotal }) {
  const imageUrl = mediaUrl(artist.image_small);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
      {/* Avatar */}
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-surface-subtle shrink-0 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <span className="text-4xl font-bold text-brand-500" aria-hidden="true">
            {artist.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-center sm:text-right min-w-0">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink truncate">
            {artist.name}
          </h1>
         
        </div>

        {/* Genres */}
        {artist.genres?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-3">
            {artist.genres.map(g => (
              <Badge key={g.id} variant="outline" size="sm">
                {g.display_name || g.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center sm:justify-start text-sm text-ink-muted">
          {artist.views != null && (
            <span><span className="text-ink font-medium">{formatNumber(artist.views)}</span> views</span>
          )}
          {artist.plays != null && (
            <span><span className="text-ink font-medium">{formatNumber(artist.plays)}</span> plays</span>
          )}
          {singlesCount > 0 && (
            <span><span className="text-ink font-medium">{singlesCount}</span> singles</span>
          )}
          {albumsTotal > 0 && (
            <span><span className="text-ink font-medium">{albumsTotal}</span> albums</span>
          )}
        </div>
      </div>
    </div>
  );
}