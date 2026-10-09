// game/src/components/domain/Artists/ArtistSearch.jsx
import { useMemo } from 'react';

/**
 * Dropdown of matching artists for the current query.
 * Renders nothing when the query is too short or no match exists.
 *
 *   <ArtistSearch
 *     query={q}
 *     artists={artists}
 *     onPick={(artist) => ...}
 *   />
 */
export function SetupArtistSearch({ query, artists, onPick, minChars = 2 }) {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < minChars) return [];

    return artists
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, 8);   // hard cap — no need to list 50
  }, [query, artists, minChars]);

  if (query.trim().length < minChars) return null;

  if (matches.length === 0) {
    return (
      <div className="
        absolute z-20 left-0 right-0 mt-1
        rounded-md border border-border bg-surface shadow-lg
        px-4 py-3 text-sm text-ink-subtle
      ">
        No artists match “{query.trim()}”.
      </div>
    );
  }

  return (
    <ul className="
      absolute z-20 left-0 right-0 mt-1
      rounded-md border border-border bg-surface shadow-lg
      max-h-72 overflow-y-auto
    ">
      {matches.map((artist) => (
        <li key={artist.id}>
          <button
            type="button"
            onClick={() => onPick?.(artist)}
            className="
              w-full text-left px-4 py-2.5 flex items-center justify-between
              text-sm text-ink
              hover:bg-surface-2 transition-colors
            "
          >
            <span className="truncate">{artist.name}</span>
            <span className="text-xs text-ink-subtle shrink-0 ml-3">
              {artist.tracks_count ?? 0} clips
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}