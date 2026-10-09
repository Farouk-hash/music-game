// admin/src/components/domain/AlbumatyTrackPicker.jsx
import { useMemo, useState } from 'react';
import { Button } from '../../ui/Button';

// Stable empty-array references. Using a constant avoids creating
// a new array every render when item.albums / item.singles are missing,
// which would invalidate any useMemo that depends on them.
const EMPTY_ARRAY = [];

/**
 * Two-tab picker: Albums + Singles.
 * Each song has a checkbox. Selection lives on `song.selected`.
 *
 * onSelectionChange(nextItem) → parent replaces the cart row.
 */
export function AlbumatyTrackPicker({ item, onSelectionChange }) {
  const [tab, setTab] = useState('albums');

  const albums  = item.albums  ?? EMPTY_ARRAY;
  const singles = item.singles ?? EMPTY_ARRAY;

  const totalTracks = useMemo(
    () => albums.reduce((n, a) => n + a.songs.length, 0) + singles.length,
    [albums, singles]
  );

  const totalSelected = useMemo(
    () =>
      albums.reduce((n, a) => n + a.songs.filter(s => s.selected).length, 0) +
      singles.filter(s => s.selected).length,
    [albums, singles]
  );

  function toggleInAlbum(albumId, songId, selected) {
    const nextAlbums = albums.map(a => {
      if (a.id !== albumId) return a;
      return {
        ...a,
        songs: a.songs.map(s => (s.id === songId ? { ...s, selected } : s)),
      };
    });
    onSelectionChange({ ...item, albums: nextAlbums });
  }

  function toggleSingle(songId, selected) {
    const nextSingles = singles.map(s =>
      s.id === songId ? { ...s, selected } : s
    );
    onSelectionChange({ ...item, singles: nextSingles });
  }

  function toggleAlbumAll(albumId, selected) {
    const nextAlbums = albums.map(a => {
      if (a.id !== albumId) return a;
      return { ...a, songs: a.songs.map(s => ({ ...s, selected })) };
    });
    onSelectionChange({ ...item, albums: nextAlbums });
  }

  function selectAllOverall(selected) {
    const nextAlbums = albums.map(a => ({
      ...a,
      songs: a.songs.map(s => ({ ...s, selected })),
    }));
    const nextSingles = singles.map(s => ({ ...s, selected }));
    onSelectionChange({ ...item, albums: nextAlbums, singles: nextSingles });
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-2">
        <button
          type="button"
          onClick={() => setTab('albums')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            tab === 'albums'
              ? 'bg-brand-500 text-white'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Albums ({albums.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('singles')}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            tab === 'singles'
              ? 'bg-brand-500 text-white'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Singles ({singles.length})
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ink-subtle tabular-nums">
            {totalSelected} / {totalTracks}
          </span>
          <Button size="sm" variant="ghost" onClick={() => selectAllOverall(true)}>
            All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => selectAllOverall(false)}>
            None
          </Button>
        </div>
      </div>

      {/* Albums tab */}
      {tab === 'albums' && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {albums.length === 0 && (
            <p className="text-xs text-ink-subtle text-center py-4">No albums.</p>
          )}
          {albums.map(album => (
            <div
              key={album.id}
              className="rounded border border-surface-border bg-surface-subtle"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border gap-2">
                <p className="text-xs font-medium text-ink truncate" title={album.name}>
                  {album.name}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleAlbumAll(album.id, true)}
                    className="text-[10px] text-brand-400 hover:text-brand-500"
                  >
                    all
                  </button>
                  <span className="text-ink-subtle">·</span>
                  <button
                    type="button"
                    onClick={() => toggleAlbumAll(album.id, false)}
                    className="text-[10px] text-ink-muted hover:text-ink"
                  >
                    none
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-surface-border">
                {album.songs.map(song => (
                  <li
                    key={song.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={!!song.selected}
                      onChange={e =>
                        toggleInAlbum(album.id, song.id, e.target.checked)
                      }
                      className="shrink-0"
                    />
                    <span className="text-ink truncate" title={song.name}>
                      {song.name}
                    </span>
                    <span className="text-[10px] text-ink-subtle ml-auto shrink-0 tabular-nums">
                      #{song.id}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Singles tab */}
      {tab === 'singles' && (
        <div className="max-h-96 overflow-y-auto pr-1">
          {singles.length === 0 && (
            <p className="text-xs text-ink-subtle text-center py-4">No singles.</p>
          )}
          {singles.length > 0 && (
            <ul className="divide-y divide-surface-border border border-surface-border rounded">
              {singles.map(song => (
                <li
                  key={song.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={!!song.selected}
                    onChange={e => toggleSingle(song.id, e.target.checked)}
                    className="shrink-0"
                  />
                  <span className="text-ink truncate" title={song.name}>
                    {song.name}
                  </span>
                  <span className="text-[10px] text-ink-subtle ml-auto shrink-0 tabular-nums">
                    #{song.id}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}