import { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../Modal/Modal';
import { Button } from '../../ui/Button';
import { useCloudflareArtists } from '../../../hooks/cloud-flare/useCloudflareArtists';
import { useArtistAlbumNames } from '../../../hooks/cloud-flare/ReleaseYears/useArtistAlbumNames';

// Keep in sync with:
//   - server/routes/pipeline-routes.js
//   - server/scripts/pipeline/album-years.js
// Sanity rails — the catalogue is well under 400 artists, so these
// are effectively unreachable in normal use.
const MAX_ARTISTS = 400;
const MAX_PAIRS = 10000;


/**
 * Batch album-years pipeline launcher.
 *
 * Flow:
 *   1. Search + pick one or more artists
 *   2. For each, tick the albums to resolve (search within the list too)
 *   3. Send → POST /api/pipeline/jobs { scope: 'album-years', pairs }
 */
export function AlbumYearsBatchModal({ open, onClose, onStart, starting }) {
  const { artists: allArtists = [], loading: artistsLoading } = useCloudflareArtists();

  const [selected, setSelected] = useState({});   // artist_id → string[]
  const [expanded, setExpanded] = useState({});   // artist_id → bool
  const [artistQuery, setArtistQuery] = useState('');
  const [error, setError] = useState(null);

  const artists = useMemo(() => {
    return allArtists
      .map(a => ({ id: a.id, name: a.name ?? `Artist #${a.id}` }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [allArtists]);

  // ── Artist search: filter by name or id ────────────────
  const filteredArtists = useMemo(() => {
    const q = artistQuery.trim();
    if (!q) return artists;

    const norm = q.toLowerCase();
    return artists.filter(a => {
      if (String(a.id) === norm) return true;
      if (a.name.toLowerCase().includes(norm)) return true;
      // Arabic-normalized loose match — dots (RTL vs LTR) don't matter
      // since we're just doing a lowercase substring contains.
      return false;
    });
  }, [artists, artistQuery]);

  const selectedArtistIds = Object.keys(selected).map(Number);

  function toggleArtist(artistId) {
    setSelected(prev => {
      const next = { ...prev };
      if (next[artistId]) delete next[artistId];
      else next[artistId] = [];
      return next;
    });
    setExpanded(prev => ({ ...prev, [artistId]: true }));
  }

  function toggleExpand(artistId) {
    setExpanded(prev => ({ ...prev, [artistId]: !prev[artistId] }));
  }

  function setArtistAlbums(artistId, albumNames) {
    setSelected(prev => ({ ...prev, [artistId]: albumNames }));
  }

  // ── Select-all / clear-all filtered artists ────────────
  function selectAllFiltered() {
    setSelected(prev => {
      const next = { ...prev };
      for (const a of filteredArtists) {
        if (!next[a.id]) next[a.id] = [];
      }
      return next;
    });
  }
  function clearAll() {
    setSelected({});
    setExpanded({});
  }

  const totalPairs = useMemo(
    () => Object.values(selected).reduce((n, arr) => n + arr.length, 0),
    [selected]
  );

  const canSend =
    selectedArtistIds.length > 0 &&
    selectedArtistIds.length <= MAX_ARTISTS &&
    totalPairs > 0 &&
    totalPairs <= MAX_PAIRS &&
    !starting;

  async function handleSend() {
    setError(null);
    const pairs = selectedArtistIds
      .filter(id => (selected[id]?.length ?? 0) > 0)
      .map(id => {
        const a = artists.find(x => x.id === id);
        return {
          artist_id: id,
          artist_name: a?.name ?? `Artist #${id}`,
          album_names: selected[id],
        };
      });

    if (pairs.length === 0) {
      setError('Select at least one album to send.');
      return;
    }

    try {
      await onStart({ scope: 'album-years', pairs });
      setSelected({});
      setExpanded({});
      setArtistQuery('');
      onClose();
    } catch (e) {
      setError(e.message ?? 'Failed to start job');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batch album-years pipeline"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Search for artists, pick the albums to resolve. The pipeline hits matb3aa
          and albumaty, resolves each album, and writes the results back to D1.
        </p>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-surface-subtle px-3 py-2">
            <div className="text-ink-muted">Artists</div>
            <div className="text-ink tabular-nums font-medium">
              {selectedArtistIds.length} / {MAX_ARTISTS}
            </div>
          </div>
          <div className="rounded-md bg-surface-subtle px-3 py-2">
            <div className="text-ink-muted">Album pairs</div>
            <div className="text-ink tabular-nums font-medium">
              {totalPairs} / {MAX_PAIRS}
            </div>
          </div>
          <div className="rounded-md bg-surface-subtle px-3 py-2">
            <div className="text-ink-muted">Estimate</div>
            <div className="text-ink tabular-nums font-medium">
              ~{Math.max(1, Math.round(totalPairs / 5))}s
            </div>
          </div>
        </div>

        {/* ── Artist search bar ─────────────────────── */}
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-ink-subtle pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              value={artistQuery}
              onChange={e => setArtistQuery(e.target.value)}
              dir="auto"
              placeholder="Search artists by name or ID…"
              className="w-full h-10 pl-8 pr-9 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {artistQuery && (
              <button
                type="button"
                onClick={() => setArtistQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-ink-subtle hover:text-ink"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-subtle">
              {artistQuery
                ? `${filteredArtists.length} of ${artists.length} artists match`
                : `${artists.length} artists`}
              {selectedArtistIds.length > 0 && (
                <> · <span className="text-emerald-400">{selectedArtistIds.length} selected</span></>
              )}
            </span>
            <div className="flex gap-2">
              {filteredArtists.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-brand-400 hover:text-brand-300"
                >
                  Select all{artistQuery ? ' matches' : ''}
                </button>
              )}
              {selectedArtistIds.length > 0 && (
                <>
                  <span className="text-ink-subtle">·</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-ink-muted hover:text-ink"
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Artist list ───────────────────────────── */}
        {artistsLoading ? (
          <p className="text-sm text-ink-muted">Loading artists…</p>
        ) : filteredArtists.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 text-center">
            No artists match "{artistQuery}"
          </p>
        ) : (
          <div className="max-h-[520px] overflow-y-auto rounded-md border border-surface-border divide-y divide-surface-border">
            {filteredArtists.map(a => {
              const isSelected = !!selected[a.id];
              const isExpanded = !!expanded[a.id];
              const albums = selected[a.id] ?? [];
              return (
                <ArtistRow
                  key={a.id}
                  artist={a}
                  selected={isSelected}
                  expanded={isExpanded}
                  albums={albums}
                  onToggleArtist={() => toggleArtist(a.id)}
                  onToggleExpand={() => toggleExpand(a.id)}
                  onChangeAlbums={(next) => setArtistAlbums(a.id, next)}
                />
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={starting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!canSend}
            loading={starting}
          >
            {starting ? 'Starting…' : `Send (${totalPairs} pairs)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   One artist row. Includes its own album search when expanded.
   ═══════════════════════════════════════════════════════════ */

function ArtistRow({
  artist,
  selected,
  expanded,
  albums,
  onToggleArtist,
  onToggleExpand,
  onChangeAlbums,
}) {
  const {
    data: albumData,
    isLoading,
    error,
  } = useArtistAlbumNames(selected ? artist.id : undefined);

  const [albumQuery, setAlbumQuery] = useState('');

  const allSuggestions = useMemo(
    () => albumData?.albumNames ?? [],
    [albumData]
  );

  const suggestions = useMemo(() => {
    const q = albumQuery.trim();
    if (!q) return allSuggestions;
    const norm = q.toLowerCase();
    return allSuggestions.filter(name => name.toLowerCase().includes(norm));
  }, [allSuggestions, albumQuery]);

  // ── Auto-select all albums the first time they arrive ──
  // Only fires when this artist is selected, the album list just
  // landed, and the user hasn't already made a choice (empty array).
  // The `albums.length === 0` guard means: once the user unticks
  // something, we never force it back on.
  useEffect(() => {
    if (!selected) return;
    if (allSuggestions.length === 0) return;
    if (albums.length > 0) return;      // user already has a selection
    onChangeAlbums([...allSuggestions]);
  }, [selected, allSuggestions, albums.length, onChangeAlbums]);


  const albumsSet = new Set(albums);

  function toggleAlbum(name) {
    const next = albumsSet.has(name)
      ? albums.filter(n => n !== name)
      : [...albums, name];
    onChangeAlbums(next);
  }

  function selectAllVisible() {
    const merged = new Set(albums);
    for (const name of suggestions) merged.add(name);
    onChangeAlbums([...merged]);
  }
  function clearAll() {
    onChangeAlbums([]);
  }

  const allSelectedVisible = suggestions.length > 0 &&
    suggestions.every(n => albumsSet.has(n));

  return (
    <div className="bg-surface">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-subtle transition-colors">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleArtist}
          className="h-4 w-4 accent-brand-500"
        />
        <button
          type="button"
          onClick={onToggleExpand}
          disabled={!selected}
          className="flex-1 text-left text-sm text-ink disabled:text-ink-subtle disabled:cursor-default"
        >
          {artist.name}
          <span className="text-xs text-ink-subtle ml-2">#{artist.id}</span>
        </button>
        {selected && albums.length > 0 && (
          <span className="text-xs text-emerald-400 tabular-nums">
            {albums.length} selected
          </span>
        )}
        {selected && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs text-ink-subtle hover:text-ink"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {/* Body */}
      {selected && expanded && (
        <div className="px-3 pb-3 space-y-2">
          {isLoading && (
            <p className="text-xs text-ink-subtle">Loading albums…</p>
          )}
          {error && (
            <p className="text-xs text-danger">Could not load albums: {error.message}</p>
          )}
          {!isLoading && allSuggestions.length === 0 && (
            <p className="text-xs text-ink-subtle">
              No album names in D1 for this artist.
            </p>
          )}

          {allSuggestions.length > 0 && (
            <>
              {/* Album search bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-2.5 flex items-center text-ink-subtle text-xs pointer-events-none">
                  ⌕
                </span>
                <input
                  type="text"
                  value={albumQuery}
                  onChange={e => setAlbumQuery(e.target.value)}
                  dir="auto"
                  placeholder={`Search ${allSuggestions.length} album${allSuggestions.length === 1 ? '' : 's'}…`}
                  className="w-full h-8 pl-7 pr-8 rounded-md bg-surface-subtle text-ink text-xs border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {albumQuery && (
                  <button
                    type="button"
                    onClick={() => setAlbumQuery('')}
                    className="absolute inset-y-0 right-2 flex items-center text-ink-subtle hover:text-ink text-xs"
                    aria-label="Clear album search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-subtle">
                  {albumQuery
                    ? `${suggestions.length} of ${allSuggestions.length} match`
                    : `${allSuggestions.length} albums`}
                </span>
                <div className="flex gap-2">
                  {!allSelectedVisible && suggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      className="text-brand-400 hover:text-brand-300"
                    >
                      Select all{albumQuery ? ' visible' : ''}
                    </button>
                  )}
                  {albums.length > 0 && (
                    <>
                      <span className="text-ink-subtle">·</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-ink-muted hover:text-ink"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-[11px] text-ink-subtle py-2 text-center">
                  No albums match "{albumQuery}"
                </p>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-1">
                    {suggestions.map(name => (
                    <label
                      key={name}
                      className="flex items-start gap-2 rounded px-2 py-1.5 text-xs text-ink hover:bg-surface-subtle cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={albumsSet.has(name)}
                        onChange={() => toggleAlbum(name)}
                        className="mt-0.5 h-3.5 w-3.5 accent-brand-500 shrink-0"
                      />
                      <span className="truncate" dir="auto" title={name}>
                        {name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}