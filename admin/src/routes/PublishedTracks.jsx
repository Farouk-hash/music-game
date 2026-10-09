// admin/src/routes/PublishedTracks.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useCloudflareTracks } from '../hooks/cloud-flare/useCloudflareTracks';
import { useTrackArtists } from '../hooks/cloud-flare/useTrackArtists';
import { useCloudflareTrackMutations } from '../hooks/cloud-flare/useCloudflareTrackMutations';
import { TrackClipsCard } from '../components/domain/TrackClipsCard';
import { Pagination } from '../components/ui/Pagination';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { SearchBar } from '../components/ui/SearchBar';
import { Modal } from '../components/Modal/Modal';
import { ModalForm } from '../components/Modal/ModalForm';
import { BackLink } from '../components/layout/BackLink';
import { PipelineJobPanel } from '../components/domain/PipelineJobPanel';
import { useReverseBatchJob } from '../hooks/useReverseBatchJob';
import { api } from '../lib/api';

const POSITIONS = ['start', 'middle', 'end', 'custom'];
const PER_PAGE = 24;

export default function PublishedTracks() {
  // ── Filters (server-driven) ────────────────────────────
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [page, setPage] = useState(1);

  // Filter setters that also reset pagination to page 1.
  // Doing this in the handler avoids the `setState in useEffect`
  // anti-pattern that React 19 flags.
  const onSearchChange   = useCallback((v) => { setSearch(v);         setPage(1); }, []);
  const onArtistChange   = useCallback((v) => { setArtistFilter(v);   setPage(1); }, []);
  const onPositionChange = useCallback((v) => { setPositionFilter(v); setPage(1); }, []);
  const onAlbumChange    = useCallback((v) => { setAlbumFilter(v);    setPage(1); }, []);

  const { groups, totals, loading, error, refetch } = useCloudflareTracks({
    page,
    perPage: PER_PAGE,
    artistId: artistFilter,
    position: positionFilter,
    search,
    albumName: albumFilter,
  });

  const { artists: artistOptions, byId: artistById } = useTrackArtists();
  const mutations = useCloudflareTrackMutations();

  // Fill in artist names on the loaded groups using the byId map.
  const groupsWithNames = useMemo(
    () => groups.map(g => ({
      ...g,
      artistName: g.artistId != null
        ? (artistById.get(g.artistId)?.name ?? `Artist #${g.artistId}`)
        : 'Unknown artist',
    })),
    [groups, artistById]
  );

  // ── Reverse-batch state ────────────────────────────────
  const [reverseJobId, setReverseJobId] = useState(null);
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false);
  const [reverseStarting, setReverseStarting] = useState(false);
  const [reverseError, setReverseError] = useState(null);

  const { data: reverseJob } = useReverseBatchJob(reverseJobId);

  useEffect(() => {
    if (!reverseJob) return;
    if (reverseJob.status === 'done' || reverseJob.status === 'failed') {
      refetch();
    }
  }, [reverseJob?.status, refetch]);

  // ── Audio playback ─────────────────────────────────────
  const [playingClipId, setPlayingClipId] = useState(null);
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null);

  function handlePlay(clip, url) {
    if (!url) return;
    if (playingClipId === clip.id) {
      stopPlayback();
      return;
    }
    setPlayingClipId(clip.id);
    setPlayingUrl(url);
  }

  function stopPlayback() {
    setPlayingClipId(null);
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

  // ── Edit modal ─────────────────────────────────────────
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [form, setForm] = useState({
    label: '',
    position: 'start',
    reverseRequested: false,
  });
  const isEditMode = editing != null;

  function openEditModal(clip) {
    setForm({
      label: clip.label ?? '',
      position: clip.position ?? 'start',
      reverseRequested: false,
    });
    setEditing(clip);
    setModalError(null);
  }

  function closeModal() {
    if (submitting) return;
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editing) return;
    setModalError(null);
    setSubmitting(true);
    try {
      await mutations.edit(editing.rowId, {
        name: editing.name,
        artist_id: editing.artist_id,
        r2_key: editing.r2_key,
        r2_reversed_key: editing.r2_reversed_key,
        position: form.position,
        label: form.label.trim() || null,
        album_name: editing.album_name ?? null,
        featured_artists: editing.featured_artists ?? null,
      });

      if (form.reverseRequested) {
        await mutations.reverse({
          id: editing.rowId,
          replace: !!editing.r2_reversed_key,
        });
      }

      closeModal();
    } catch (err) {
      setModalError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(clip) {
    if (!confirm(`Delete the "${clip.position}" clip for "${clip.name}"?`)) return;
    try {
      await mutations.remove(clip.rowId);
      refetch();
    } catch (e) {
      console.error('[delete]', e);
    }
  }

  async function handleDeleteReversed(clip) {
    if (!confirm(`Delete only the reversed rendition of "${clip.name}" (${clip.position})?`)) return;
    try {
      await mutations.removeReversed(clip.rowId);
      refetch();
    } catch (e) {
      console.error('[delete reversed]', e);
    }
  }

  const pendingIds = new Set();
  if (mutations.isEditing && mutations.editingId != null) {
    pendingIds.add(mutations.editingId);
  }
  if (mutations.isRemoving && mutations.removingId != null) {
    pendingIds.add(mutations.removingId);
  }

  // ── Reverse-batch ───────────────────────────────────────
  async function handleStartReverseBatch(limit) {
    setReverseError(null);
    setReverseStarting(true);
    try {
      const result = await mutations.startReverseBatch({ limit });
      if (result?.job?.id) {
        setReverseJobId(result.job.id);
        setReverseConfirmOpen(false);
      } else if (result?.count === 0) {
        setReverseError('Nothing to reverse.');
        setReverseConfirmOpen(false);
      }
    } catch (e) {
      setReverseError(e.message || 'Failed to start batch.');
    } finally {
      setReverseStarting(false);
    }
  }

  // ── Pagination controls ────────────────────────────────
  const pageCount = totals.pageCount;
  const totalItems = totals.total;
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(page * PER_PAGE, totalItems);

  // ── Render ─────────────────────────────────────────────

  if (loading && groupsWithNames.length === 0) {
    return <LoadingBlock label="Loading published tracks…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load"
        description={error.message}
        action={<Button variant="secondary" onClick={refetch}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Published Tracks</h1>
            <p className="text-sm text-ink-muted mt-1">
              {totalItems.toLocaleString()} {totalItems === 1 ? 'track' : 'tracks'} in the catalogue
              {totals.clips > 0 && (
                <> · this page: {totals.clips} {totals.clips === 1 ? 'clip' : 'clips'} across {totals.tracks} {totals.tracks === 1 ? 'track' : 'tracks'}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success">{totalItems.toLocaleString()} tracks</Badge>
            <Button
              variant="secondary"
              onClick={() => {
                setReverseError(null);
                setReverseConfirmOpen(true);
              }}
              disabled={reverseStarting}
            >
              Reverse missing
            </Button>
          </div>
        </div>

        {reverseJob && (
          <PipelineJobPanel
            job={reverseJob}
            onCancel={async () => {
              try {
                await api.post(`/pipeline/jobs/${reverseJobId}/cancel`);
              } catch (e) {
                console.error('[cancel reverse batch]', e);
              }
            }}
            cancelling={false}
          />
        )}

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
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>

          <input
            type="text"
            value={albumFilter}
            onChange={e => onAlbumChange(e.target.value)}
            placeholder="Filter by album…"
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[200px]"
          />
        </div>
      </header>

      {/* Pagination header */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-ink-subtle">
          <span>
            Showing {rangeStart}–{rangeEnd} of {totalItems.toLocaleString()} tracks
          </span>
        </div>
      )}

      {groupsWithNames.length === 0 ? (
        <EmptyState
          icon={totalItems === 0 ? '✨' : '🔎'}
          title={totalItems === 0 ? 'Nothing published yet' : 'No matches'}
          description={
            totalItems === 0
              ? 'Publish clips from an artist or album page.'
              : 'Try a different filter or search.'
          }
        />
      ) : (
        <div className="space-y-4">
          {groupsWithNames.map(group => (
            <TrackClipsCard
              key={group.key}
              group={group}
              playingClipId={playingClipId}
              onPlay={handlePlay}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onDeleteReversed={handleDeleteReversed}
              pendingIds={pendingIds}
            />
          ))}
        </div>
      )}

      {/* Pagination controls */}
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

      <audio ref={audioRef} preload="none" onEnded={stopPlayback} className="hidden" />

      {playingClipId && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-auto sm:w-[420px] card p-3 flex items-center gap-3 z-20 bg-surface-muted border border-surface-border shadow-card-hover">
          <button
            onClick={stopPlayback}
            className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0"
            aria-label="Stop"
          >
            ■
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">Now playing clip</p>
            <p className="text-xs text-ink-muted truncate">
              {playingUrl?.split('/').slice(-2).join(' — ')}
            </p>
          </div>
        </div>
      )}

      <ModalForm
        open={isEditMode}
        onClose={closeModal}
        title="Edit Clip Metadata"
        submitLabel={form.reverseRequested ? 'Save & Reverse' : 'Save Changes'}
        submitting={submitting}
        error={modalError}
        onSubmit={handleSubmit}
      >
        {editing && (
          <p className="text-xs text-ink-muted">
            Clip ID <span className="font-mono text-ink">{editing.id}</span> — {editing.name}
          </p>
        )}

        {editing?.album_name && (
          <p className="text-xs text-ink-muted">
            Album: <span className="text-ink">{editing.album_name}</span>
          </p>
        )}

        <Input
          label="Label (optional)"
          name="label"
          placeholder="e.g. Intro, Chorus"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
        />

        <div className="space-y-1">
          <label htmlFor="position" className="block text-sm font-medium text-ink">
            Position
          </label>
          <select
            id="position"
            value={form.position}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg bg-surface-subtle text-ink border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {POSITIONS.map(p => (
              <option key={p} value={p} className="capitalize">{p}</option>
            ))}
          </select>
          <p className="text-xs text-ink-subtle">
            Changing position may trigger a uniqueness conflict if another clip already uses it.
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-surface-border">
          <p className="text-sm font-medium text-ink">Reversed rendition</p>

          {!editing?.r2_key && (
            <p className="text-xs text-ink-subtle">
              No forward clip on this slot — nothing to reverse.
            </p>
          )}

          {editing?.r2_key && (
            <>
              {editing.r2_reversed_key ? (
                <div className="space-y-2">
                  <p className="text-xs text-ink-muted">This slot already has a reversed clip.</p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.reverseRequested}
                      onChange={e => setForm(f => ({ ...f, reverseRequested: e.target.checked }))}
                    />
                    Replace the existing reversed clip
                  </label>
                  {form.reverseRequested && (
                    <p className="text-xs text-warning">
                      The current reversed clip will be overwritten.
                    </p>
                  )}
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.reverseRequested}
                    onChange={e => setForm(f => ({ ...f, reverseRequested: e.target.checked }))}
                  />
                  Create a reversed version of this clip
                </label>
              )}
            </>
          )}

          {editing?.featured_artists && (
            <p className="text-xs text-ink-muted">
              Featured: <span className="text-ink">{editing.featured_artists}</span>
            </p>
          )}
        </div>
      </ModalForm>

      <Modal
        open={reverseConfirmOpen}
        onClose={() => {
          if (!reverseStarting) {
            setReverseConfirmOpen(false);
            setReverseError(null);
          }
        }}
      >
        <div className="rounded-lg border border-surface-border bg-surface p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Reverse missing clips?</h2>
            <p className="text-sm text-ink-muted mt-2">
              Generate a reversed rendition for every published clip that
              doesn't already have one.
            </p>
          </div>

          <p className="text-xs text-ink-muted">
            The job runs on the local Express server. You can close this page
            or navigate away — progress continues in the background.
          </p>

          {reverseError && <p className="text-sm text-danger">{reverseError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setReverseConfirmOpen(false);
                setReverseError(null);
              }}
              disabled={reverseStarting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleStartReverseBatch(null)}
              disabled={reverseStarting}
              loading={reverseStarting}
            >
              {reverseStarting ? 'Starting…' : 'Start batch'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}