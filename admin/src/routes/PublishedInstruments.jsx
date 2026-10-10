// admin/src/routes/PublishedInstruments.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInstruments } from '../hooks/cloud-flare/Instrumental/useInstruments';
import { useInstrumentMutations } from '../hooks/cloud-flare/Instrumental/useInstrumentMutations';
import { useTrackArtists } from '../hooks/cloud-flare/useTrackArtists';
import { InstrumentCard } from '../components/domain/Instrumental/InstrumentCard';
import { Pagination } from '../components/ui/Pagination';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { BackLink } from '../components/layout/BackLink';
import { Badge } from '../components/ui/Badge';

const PER_PAGE = 24;
const POSITIONS = ['middle', 'custom'];

export default function PublishedInstruments() {
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [page, setPage] = useState(1);

  const onSearchChange = useCallback((v) => { setSearch(v); setPage(1); }, []);
  const onArtistChange = useCallback((v) => { setArtistFilter(v); setPage(1); }, []);
  const onPositionChange = useCallback((v) => { setPositionFilter(v); setPage(1); }, []);

  const { tracks, totals, loading, error, refetch } = useInstruments({
    page,
    perPage: PER_PAGE,
    artistId: artistFilter,
    position: positionFilter,
    search,
  });

  const { artists: artistOptions, byId: artistById } = useTrackArtists();
  const mutations = useInstrumentMutations();

  // Audio playback
  const [playingKey, setPlayingKey] = useState(null); // `${trackKey}::${position}`
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null);

  function handlePlay(trackKey, seg, url) {
    const key = `${trackKey}::${seg}`;
    if (playingKey === key) {
      stopPlayback();
      return;
    }
    setPlayingKey(key);
    setPlayingUrl(url);
  }

  function stopPlayback() {
    setPlayingKey(null);
    setPlayingUrl(null);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!playingUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    if (audio.src !== playingUrl) {
      audio.src = playingUrl;
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('[audio] play failed:', e.message));
    }
  }, [playingUrl]);

  // Deletions
  const pendingIds = useMemo(() => {
    const s = new Set();
    if (mutations.removeSegment.isPending && mutations.removeSegment.variables != null) {
      s.add(mutations.removeSegment.variables);
    }
    return s;
  }, [mutations.removeSegment.isPending, mutations.removeSegment.variables]);

  async function handleDeleteSegment(row) {
    if (!confirm(`Delete the "${row.position}" segment of "${row.track_name}"?`)) return;
    try {
      await mutations.removeSegment.mutateAsync(row.id);
      refetch();
    } catch (e) {
      console.error('[delete segment]', e);
      alert(e.message);
    }
  }

  async function handleDeleteTrack(track) {
    const rows = Object.values(track.segments).filter(Boolean);
    if (rows.length === 0) return;
    if (!confirm(`Delete all ${rows.length} segments of "${track.trackName}"?`)) return;
    try {
      await mutations.removeTrack.mutateAsync(rows.map(r => r.id));
      refetch();
    } catch (e) {
      console.error('[delete track]', e);
      alert(e.message);
    }
  }

  const pageCount = totals.pageCount;
  const totalItems = totals.total;
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, totalItems);

  return (
    <div className="space-y-6 pb-32">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Published Instruments</h1>
            <p className="text-sm text-ink-muted mt-1">
              {loading && !tracks.length
                ? 'Loading…'
                : `${totalItems.toLocaleString()} ${totalItems === 1 ? 'segment' : 'segments'} across ${totals.tracks} ${totals.tracks === 1 ? 'track' : 'tracks'}`}
            </p>
          </div>
          <Badge variant="success">{totalItems.toLocaleString()} segments</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchBar
              initialValue={search}
              onSubmit={onSearchChange}
              placeholder="Filter by track name…"
              submitLabel="Filter"
            />
          </div>

          <select
            value={artistFilter}
            onChange={e => onArtistChange(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All artists ({artistOptions.length})</option>
            {artistOptions.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={positionFilter}
            onChange={e => onPositionChange(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All positions</option>
            {POSITIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </header>

      {pageCount > 1 && (
        <div className="text-xs text-ink-subtle">
          Showing {rangeStart}–{rangeEnd} of {totalItems.toLocaleString()} segments
        </div>
      )}

      {loading && !tracks.length ? (
        <LoadingBlock label="Loading instruments…" />
      ) : error ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load"
          description={error.message}
          action={<button onClick={refetch} className="text-brand-500 underline">Retry</button>}
        />
      ) : tracks.length === 0 ? (
        <EmptyState
          icon="✨"
          title={totalItems === 0 ? 'No instruments yet' : 'No matches'}
          description={
            totalItems === 0
              ? 'Generate instruments from the Published Artists page, then upload them.'
              : 'Try a different filter or search.'
          }
        />
      ) : (
        <div className="space-y-3">
          {tracks.map(track => {
            const artistName = artistById.get(track.artistId)?.name ?? `Artist #${track.artistId}`;
            return (
              <InstrumentCard
                key={track.key}
                track={track}
                artistName={artistName}
                playingSeg={
                  playingKey?.startsWith(`${track.key}::`)
                    ? playingKey.split('::')[1]
                    : null
                }
                onPlay={(seg, url) => handlePlay(track.key, seg, url)}
                onDeleteSegment={handleDeleteSegment}
                onDeleteTrack={() => handleDeleteTrack(track)}
                pendingIds={pendingIds}
              />
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination
          page={page}
          totalPages={pageCount}
          hasPrev={page > 1}
          hasNext={page < pageCount}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(pageCount, p + 1))}
          onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
          className="pt-2"
        />
      )}

      <audio
        ref={audioRef}
        preload="none"
        onEnded={stopPlayback}
        className="hidden"
      />
    </div>
  );
}