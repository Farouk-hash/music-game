// src/routes/QuranReciterDetail.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useQuranReciter } from '../hooks/quran/useQuranReciter';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { useArtistAdmin } from '../hooks/cloud-flare/useArtistAdmin';
import { usePublishClips } from '../hooks/cloud-flare/usePublishClips';
import { SurahList } from '../components/domain/SurahList';
import { ArtistModalFields } from '../components/domain/ArtistModalFields';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { BackLink } from '../components/layout/BackLink';
import { PublishClipsModal } from '../components/domain/PublishClipsModal';
import { PublishClipsToolbar } from '../components/domain/PublishClipsToolbar';
import { ModalForm } from '../components/Modal/ModalForm';
import { useReciterClipCounts } from '../hooks/quran/useReciterClipCounts';

export default function QuranReciterDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { reciter, surahs, moshafs, loading, error } = useQuranReciter(id);

  // ── Moshaf selection ────────────────────────────────────
  // Derived default: first moshaf. Once the user picks one, it stays.
  const [moshafOverride, setMoshafOverride] = useState(null);

  const activeMoshafId = useMemo(() => {
    if (moshafOverride != null) return moshafOverride;
    return moshafs[0]?.id ?? null;
  }, [moshafOverride, moshafs]);

  // Surahs visible under the active moshaf
  const visibleSurahs = useMemo(
    () => surahs.filter(s => s.moshafId === activeMoshafId),
    [surahs, activeMoshafId]
  );

  // ── Published status ────────────────────────────────────
  const { artists: cfArtists, loading: cfLoading } = useCloudflareArtists({ genreId: null });

  const isPublished = useMemo(
    () => cfArtists.some(a => a.name === reciter?.name),
    [cfArtists, reciter]
  );
  const { clipCounts } = useReciterClipCounts({
  reciterId: isPublished ? reciter?.id : null,
});
  // ── Artist admin hook (for publishing the reciter itself) ──
  const admin = useArtistAdmin({ genreId: null, defaultGenreIds: [] });

  function openPublishReciter() {
    admin.openFor({
      id: reciter.id,
      name: reciter.name,
      image_small: null,
      genres: [],
    });
  }

  // ── Clip selection state ────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isClipModalOpen, setIsClipModalOpen] = useState(false);

  function toggleSelected(surahId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(surahId)) next.delete(surahId);
      else next.add(surahId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Switch moshaf and prune selection to the new moshaf's surahs
  const handleMoshafChange = useCallback((newMoshafId) => {
    setMoshafOverride(newMoshafId);

    // Keep only surah IDs that belong to the new moshaf
    const newMoshafSurahIds = new Set(
      surahs.filter(s => s.moshafId === newMoshafId).map(s => s.id)
    );
    setSelectedIds(prev => {
      const next = new Set();
      for (const sid of prev) {
        if (newMoshafSurahIds.has(sid)) next.add(sid);
      }
      return next;
    });
  }, [surahs]);

  // Selected surahs — filtered through visibleSurahs so switching moshafs
  // never leaks selections from another moshaf.
  const selectedTracks = useMemo(
    () => visibleSurahs.filter(s => selectedIds.has(s.id)),
    [visibleSurahs, selectedIds]
  );

  const selectionCount = selectedTracks.length;

  // ── Publish mutation ────────────────────────────────────
  const publish = usePublishClips();

  async function handlePublishClips(clips) {
    const tagged = clips.map(c => ({ ...c, source: 'quran' }));
    try {
      await publish.mutateAsync({ clips: tagged });
    } catch (e) {
      console.error('[publish clips]', e);
    }
  }

  // ── Audio playback ──────────────────────────────────────
  const [playback, setPlayback] = useState({ id: null, surah: null });
  const nowPlaying = playback.id === id ? playback.surah : null;
  const playSurah = (surah) => setPlayback({ id, surah });
  const stopPlayback = () => setPlayback({ id: null, surah: null });

  const audioRef = useRef(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!nowPlaying?.src) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    if (audio.src !== nowPlaying.src) {
      audio.src = nowPlaying.src;
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('[audio] play failed:', e.message));
    }
  }, [nowPlaying]);

  const backTo = location.state?.from ?? '/quran';
  const backLabel = location.state?.fromLabel ?? 'Back to reciters';

  // ── Loading / error states ──────────────────────────────
  if (loading || cfLoading) {
    return <LoadingBlock label="Loading reciter…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load reciter"
        description={error.message}
      />
    );
  }

  if (!reciter) {
    return (
      <div className="space-y-6">
        <BackLink to={backTo}>{backLabel}</BackLink>
        <EmptyState
          icon="📖"
          title="Reciter not found"
          description={`No reciter matches ID "${id}".`}
        />
      </div>
    );
  }

  // Tabs for moshafs — only shown when more than one exists
  const moshafTabs = moshafs.map(m => ({
    id: m.id,
    label: m.name,
    count: surahs.filter(s => s.moshafId === m.id).length,
  }));

  return (
    <div className="space-y-6 pb-32">
      <BackLink to={backTo}>{backLabel}</BackLink>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-24 h-24 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-4xl font-bold shrink-0">
          {reciter.letter || reciter.name.charAt(0)}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2">
            {reciter.name}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center sm:justify-start text-sm text-ink-muted">
            <span>{reciter.surahCount} surahs</span>
            {reciter.moshafCount > 1 && <span>{reciter.moshafCount} moshafs</span>}
          </div>
        </div>
      </div>

      {/* ── Publish status banner ─────────────────────────── */}
      {isPublished ? (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 flex items-center gap-2">
          <Badge variant="success">✓ Published</Badge>
          <span className="text-sm text-ink-muted">
            Select surahs below to publish clips.
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-warning/40 bg-warning-subtle flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-warning">
              This reciter isn't published yet
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              Publish the reciter first to enable surah clip publishing.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openPublishReciter}>
            Publish reciter →
          </Button>
        </div>
      )}

      {/* ── Moshaf tabs (only if more than one) ───────────── */}
      {moshafs.length > 1 && (
        <div className="border-b border-surface-border">
          <Tabs
            tabs={moshafTabs}
            active={activeMoshafId}
            onChange={handleMoshafChange}
          />
        </div>
      )}

      {/* ── Selection toolbar (only when published) ───────── */}
      {isPublished && (
        <PublishClipsToolbar
          count={selectionCount}
          onClear={clearSelection}
          onPublish={() => setIsClipModalOpen(true)}
        />
      )}

      {/* ── Surah list ───────────────────────────────────── */}
      <SurahList
        surahs={visibleSurahs}
        onPlay={playSurah}
        selectable={isPublished}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelected}
        playingId={nowPlaying?.id ?? null}
        showMoshaf={false}
        clipCounts={clipCounts}  
      />

      {/* ── Audio banner ─────────────────────────────────── */}
      {nowPlaying && (
        <>
          <audio
            ref={audioRef}
            controls
            preload="none"
            className="fixed bottom-20 left-4 right-4 sm:w-[420px] sm:right-auto sm:left-auto z-30 bg-surface-muted rounded-lg shadow-card-hover"
          />
          <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-auto sm:w-[420px] card p-3 flex items-center gap-3 z-20 bg-surface-muted border border-surface-border shadow-card-hover">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{nowPlaying.name}</p>
              <p className="text-xs text-ink-muted truncate">{reciter.name}</p>
            </div>
            <button
              onClick={stopPlayback}
              aria-label="Stop"
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
            >
              ✕
            </button>
          </div>
        </>
      )}

      {/* ── Publish reciter modal ────────────────────────── */}
      <ModalForm
        open={admin.isModalOpen}
        onClose={admin.close}
        title={admin.isEditMode ? 'Edit Reciter' : 'Publish Reciter'}
        submitLabel={admin.isEditMode ? 'Save Changes' : 'Publish'}
        submitting={admin.submitting}
        error={admin.modalError}
        onSubmit={admin.submit}
      >
        <ArtistModalFields
          form={admin.form}
          setForm={admin.setForm}
          isEditMode={admin.isEditMode}
          genreOptions={admin.genreOptions}
        />
      </ModalForm>

      {/* ── Clip publishing modal ────────────────────────── */}
      {isPublished && (
        <PublishClipsModal
          key={selectedTracks.map(t => t.id).join(',')}
          open={isClipModalOpen}
          onClose={() => setIsClipModalOpen(false)}
          tracks={selectedTracks}
          artistId={reciter.id}
          onPublish={handlePublishClips}
          publishing={publish.isPending}
          result={publish.data}
          error={publish.error?.message ?? null}
          onReset={() => { publish.reset(); clearSelection(); }}
        />
      )}
    </div>
  );
}