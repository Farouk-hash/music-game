
import { useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useArtist } from '../hooks/useArtist';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { usePublishClips } from '../hooks/cloud-flare/usePublishClips';
import { ArtistHeader } from '../components/domain/ArtistHeader';
import { TrackList } from '../components/domain/TrackList';
import { AlbumGrid } from '../components/domain/AlbumGrid';
import { Tabs } from '../components/ui/Tabs';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BackLink } from '../components/layout/BackLink';
import { PublishClipsModal } from '../components/domain/PublishClipsModal';
import { PublishClipsToolbar } from '../components/domain/PublishClipsToolbar';
import { mediaUrl } from '../lib/format';
import { useArtistClipCounts } from '../hooks/cloud-flare/useArtistClipCounts';
import { AlbumsPublishToolbar } from '../components/domain/AlbumsPublishToolbar';
import { useAlbumsTracks } from '../hooks/cloud-flare/useAlbumsTracks';

export default function ArtistDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const {
    artist, tracks, topTracks, mostPlayed, albums,
    singlesCount, tracksTotal, albumsTotal,
    loading, error,
  } = useArtist(slug);

  // Check if this artist is published to Cloudflare
  const { artists: cfArtists, loading: cfLoading } = useCloudflareArtists({ genreId: null });
  const cfArtist = useMemo(
    () => cfArtists.find(a => a.name === artist?.name),
    [cfArtists, artist]
  );
  const isPublished = cfArtist != null;

  // ── Selection state ────────────────────────────────────
  // const [selectedIds, setSelectedIds] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selection, setSelection] = useState({ tab: 'all', ids: new Set() });
  const selectedIds = selection.ids;

  function toggleSelected(trackId) {
    setSelection(prev => {
      const next = new Set(prev.ids);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return { ...prev, ids: next };
    });
  }
  function clearSelection() {
    setSelection(prev => ({ ...prev, ids: new Set() }));
  }

  // Selected track objects
  const selectedTracks = useMemo(
    () => tracks.filter(t => selectedIds.has(t.id)),
    [tracks, selectedIds]
  );

  // ── Publish mutation ───────────────────────────────────
  const publish = usePublishClips();

  async function handlePublish(clips) {
     const tagged = clips.map(c => ({
      ...c,
      album_name: c._albumName ?? c.album_name ?? null,
    }));
    try {
      await publish.mutateAsync({ clips:tagged });
    } catch (e) {
      // Error surfaces via publish.error
      console.error('[publish]', e);
    }
  }

  // ── Audio playback (unchanged) ─────────────────────────
  const [activeTab, setActiveTab] = useState('all');
  const audioRef = useRef(null);

  const [playback, setPlayback] = useState({ slug: null, track: null });

  // Derived value — automatically null when the slug changes
  const nowPlaying = playback.slug === slug ? playback.track : null;

  // Play handler:
  function playTrack(track) {
    setPlayback({ slug, track });
  }

  // Stop handler:
  function stopPlayback() {
    setPlayback({ slug: null, track: null });
  }


  const backTo = location.state?.from ?? '/artists';
  const backLabel = location.state?.fromLabel ?? 'All artists';


  const { clipCounts } = useArtistClipCounts({
    artistId: cfArtist?.id ?? null,
  });


    
  // Album selection state
  const [selectedAlbumIds, setSelectedAlbumIds] = useState(new Set());
  const [albumPublishTracks, setAlbumPublishTracks] = useState([]);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);

  const albumsTracks = useAlbumsTracks();

  function toggleAlbumSelected(albumId) {
    console.log('SELECTED ALBUMS: ',albumId)
    setSelectedAlbumIds(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  }

  function clearAlbumSelection() {
    setSelectedAlbumIds(new Set());
  }

  async function handlePublishAlbums() {
    if (selectedAlbumIds.size === 0) return;
    try {
      const tracks = await albumsTracks.fetchTracks([...selectedAlbumIds]);
      setAlbumPublishTracks(tracks);
      setIsAlbumModalOpen(true);
    } catch (e) {
      console.error('[publish albums]', e);
      // error is already in albumsTracks.error — optionally show a toast
    }
  }
  if (loading) return <LoadingBlock label="Loading artist…" />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load artist"
        description={error.message}
        action={<Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  if (!artist) {
    return (
      <div className="space-y-6">
        <BackLink to={backTo}>{backLabel}</BackLink>
        <EmptyState icon="🎤" title="Artist not found" description={`No artist matches "${slug}".`} />
      </div>
    );
  }

  const tabs = [
    { id: 'all',        label: 'All Tracks', count: tracksTotal || tracks.length },
    { id: 'top',        label: 'Top Tracks', count: topTracks.length },
    { id: 'mostPlayed', label: 'Most Played', count: mostPlayed.length },
    { id: 'albums',     label: 'Albums',      count: albumsTotal || albums.length },
  ];

  const tracksForTab =
    activeTab === 'top'        ? topTracks :
    activeTab === 'mostPlayed' ? mostPlayed :
    activeTab === 'all'        ? tracks :
    [];

  const selectionCount = selectedIds.size;

  return (
    <div className="space-y-6 pb-32">
      <BackLink to={backTo}>{backLabel}</BackLink>

      <ArtistHeader
        artist={artist}
        singlesCount={singlesCount}
        albumsTotal={albumsTotal}
      />

      {/* ── Published status banner ───────────────────────── */}
      {!cfLoading && (
        isPublished ? (
          <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">✓ Published to Cloudflare</Badge>
              <span className="text-sm text-ink-muted">
                Select tracks below to publish clips.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-warning/40 bg-warning-subtle flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-warning">This artist isn't in Cloudflare yet</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Publish this artist first to enable track clip publishing.
              </p>
            </div>
            <Button
              as="a"
              href="/published/artists"
              variant="primary"
              size="sm"
            >
              Go to Artists →
            </Button>
          </div>
        )
      )}

      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(nextTab) => {
          setActiveTab(nextTab);
          setSelection({ tab: nextTab, ids: new Set() });
        }}
      />

      {/* ── Selection toolbar ─────────────────────────────── */}
      {activeTab !== 'albums' && isPublished && (
        <PublishClipsToolbar
          count={selectionCount}
          onClear={clearSelection}
          onPublish={() => setIsModalOpen(true)}
        />
      )}

      {activeTab === 'albums' ? (
        albums.length ? (
          <>
            {/* Album publish toolbar */}
            {isPublished && (
              <AlbumsPublishToolbar
                count={selectedAlbumIds.size}
                onClear={clearAlbumSelection}
                onPublish={handlePublishAlbums}
                loading={albumsTracks.loading}
              />
            )}

            {albumsTracks.error && (
              <div className="p-3 rounded-lg border border-danger/40 bg-danger-subtle text-sm text-danger">
                {albumsTracks.error.message}
              </div>
            )}

            <AlbumGrid
              albums={albums}
              artistSlug={slug}
              selectable={isPublished}
              selectedIds={selectedAlbumIds}
              onToggleSelect={toggleAlbumSelected}
            />
          </>
        ) : (
          <EmptyState icon="💿" title="No albums" description="This artist has no albums listed." />
        )
      ) : (
        <TrackList
          tracks={tracksForTab}
          onPlay={playTrack}

          emptyMessage={
            activeTab === 'top' ? 'No top tracks available.' :
            activeTab === 'mostPlayed' ? 'No play-count data yet.' :
            'No tracks available.'
          }
          selectable={isPublished}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onSelectAll={(nextIds) => setSelection(prev => ({ ...prev, ids: nextIds }))}
          clipCounts={clipCounts}  
        />
      )}

      {/* Audio + banner (unchanged) */}
      {nowPlaying && (
        <>
          <audio
            ref={audioRef}
            controls
            preload="none"
            className="fixed bottom-20 left-4 right-4 sm:w-[420px] sm:right-auto sm:left-auto z-30 bg-surface-muted rounded-lg shadow-card-hover"
          />
          <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-auto sm:w-[420px] card p-3 flex items-center gap-3 z-20 bg-surface-muted border border-surface-border shadow-card-hover">
            {nowPlaying.image && (
              <img
                src={mediaUrl(nowPlaying.image)}
                alt=""
                className="w-10 h-10 rounded object-cover shrink-0"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{nowPlaying.name}</p>
              <p className="text-xs text-ink-muted truncate">
                {nowPlaying.artists?.map(a => a.name).filter(Boolean).join(', ') || artist?.name}
              </p>
            </div>
            <button
              onClick={stopPlayback}
              aria-label="Stop playback"
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
            >
              ✕
            </button>
          </div>
        </>
      )}

      {/* ── Publish modal ─────────────────────────────────── */}
      <PublishClipsModal
        key={selectedTracks.map(t => t.id).join(',')}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tracks={selectedTracks}
        artistId={cfArtist?.id ?? null}
        onPublish={handlePublish}
        publishing={publish.isPending}
        result={publish.data}
        error={publish.error?.message ?? null}
        onReset={() => { publish.reset(); clearSelection(); }}
      />


      
      {/* Album-sourced publish modal */}
      <PublishClipsModal
        key={`albums-${albumPublishTracks.map(t => t.id).join(',')}`}
        open={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        tracks={albumPublishTracks}
        artistId={cfArtist?.id ?? null}
        onPublish={handlePublish}
        publishing={publish.isPending}
        result={publish.data}
        error={publish.error?.message ?? null}
        onReset={() => {
          publish.reset();
          clearAlbumSelection();
          setAlbumPublishTracks([]);
        }}
      />
    </div>
  );
}