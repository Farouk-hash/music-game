// src/routes/AlbumDetail.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAlbum } from '../hooks/useAlbum';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { usePublishClips } from '../hooks/cloud-flare/usePublishClips';
import { TrackList } from '../components/domain/TrackList';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BackLink } from '../components/layout/BackLink';
import { PublishClipsModal } from '../components/domain/PublishClipsModal';
import { PublishClipsToolbar } from '../components/domain/PublishClipsToolbar';
import { mediaUrl } from '../lib/format';
import { useArtistClipCounts } from '../hooks/cloud-flare/useArtistClipCounts';

export default function AlbumDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { album, tracks, loading, error } = useAlbum(id);

  // ── Cloudflare artist check ────────────────────────────
  // Album tracks come from matb3aa and each has an `artists` array.
  // We use the first artist of the first track as the album's "owner"
  // and check if they exist in Cloudflare.
  const { artists: cfArtists, loading: cfLoading } = useCloudflareArtists({ genreId: null });

  const cfArtist = useMemo(() => {
    // Try album.artist first (if populated), fall back to first track's first artist
    const matb3aaArtistId = album?.artist?.id ?? tracks?.[0]?.artists?.[0]?.id;
    if (!matb3aaArtistId) return null;
    return cfArtists.find(a => a.id === matb3aaArtistId) ?? null;
  }, [cfArtists, album, tracks]);

  const isPublished = cfArtist != null;

  // ── Selection state ────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  function toggleSelected(trackId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedTracks = useMemo(
    () => tracks.filter(t => selectedIds.has(t.id)),
    [tracks, selectedIds]
  );

  // ── Publish mutation ───────────────────────────────────
  const publish = usePublishClips();

  async function handlePublish(clips) {
    // Tag each clip with this album's name before publishing.
    const albumName = album?.name ?? album?.title ?? null;
    const tagged = albumName
      ? clips.map(c => ({ ...c, album_name: albumName }))
      : clips;

    try {
      await publish.mutateAsync({ clips: tagged });
    } catch (e) {
      console.error('[publish]', e);
    }
  }
  const { clipCounts } = useArtistClipCounts({
  artistId: cfArtist?.id ?? null,
});

  // ── Audio playback ─────────────────────────────────────
  const [playback, setPlayback] = useState({ albumId: null, track: null });
  const nowPlaying = playback.albumId === id ? playback.track : null;
  const playTrack = (track) => setPlayback({ albumId: id, track });
  const stopPlayback = () => setPlayback({ albumId: null, track: null });

  const audioRef = useRef(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!nowPlaying?.audioUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    if (audio.src !== nowPlaying.audioUrl) {
      audio.src = nowPlaying.audioUrl;
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('[audio] play failed:', e.message));
    }
  }, [nowPlaying]);

  const backTo = location.state?.from ?? '/artists';
  const backLabel = location.state?.fromLabel ?? 'Back';

  if (loading) return <LoadingBlock label="Loading album…" />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load album"
        description={error.message}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!album || tracks.length === 0) {
    return (
      <div className="space-y-6">
        <BackLink to={backTo}>{backLabel}</BackLink>
        <EmptyState
          icon="💿"
          title="Album not found"
          description={`No album matches ID "${id}".`}
        />
      </div>
    );
  }

  const displayTitle = album.name || album.title || 'Untitled album';
  const year = album.release_date?.slice(0, 4);
  const coverUrl = mediaUrl(album.image);
  const selectionCount = selectedIds.size;

  return (
    <div className="space-y-6 pb-32">
      <BackLink to={backTo}>{backLabel}</BackLink>

      {/* Album header — unchanged */}
      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <div className="w-40 h-40 rounded-lg overflow-hidden bg-surface-subtle shrink-0 flex items-center justify-center">
          {coverUrl ? (
            <img src={coverUrl} alt={displayTitle} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl" aria-hidden="true">💿</span>
          )}
        </div>

        <div className="flex-1 text-center sm:text-right min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">Album</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2">{displayTitle}</h1>

          {album.artist && (
            <p className="text-sm text-ink-muted mb-3">{album.artist.name}</p>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center sm:justify-start text-sm text-ink-muted">
            {year && <span>{year}</span>}
            <span>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
          </div>
        </div>
      </div>

      {/* ── Published status banner ───────────────────────── */}
      {!cfLoading && (
        isPublished ? (
          <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 flex items-center gap-2">
            <Badge variant="success">✓ Artist published</Badge>
            <span className="text-sm text-ink-muted">
              Select tracks below to publish clips.
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-warning/40 bg-warning-subtle flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-warning">
                This album's artist isn't in Cloudflare yet
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Publish the artist first to enable clip publishing for their tracks.
              </p>
            </div>
            <Button as="a" href="/published/artists" variant="primary" size="sm">
              Go to Artists →
            </Button>
          </div>
        )
      )}

      {/* Tracklist */}
      <div>
        <h2 className="text-lg font-semibold text-ink mb-3">Tracklist</h2>

        {/* Selection toolbar */}
        {isPublished && (
          <PublishClipsToolbar
            count={selectionCount}
            onClear={clearSelection}
            onPublish={() => setIsModalOpen(true)}
          />
        )}

        <TrackList
          tracks={tracks}
          onPlay={playTrack}
          selectable={isPublished}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          clipCounts={clipCounts}
        />
      </div>

      {/* Audio + banner — unchanged */}
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
                {nowPlaying.artists?.map(a => a.name).filter(Boolean).join(', ') ||
                  album.artist?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={stopPlayback}
              aria-label="Stop playback"
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
            >
              ✕
            </button>
          </div>
        </>
      )}

      {/* Publish modal */}
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
    </div>
  );
}