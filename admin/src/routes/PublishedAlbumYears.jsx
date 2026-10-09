// src/routes/PublishedAlbumYears.jsx
import { useState, useMemo } from 'react';
import { useAlbumYears, useAlbumYearsStats } from '../hooks/cloud-flare/ReleaseYears/useAlbumYears';
import { useAlbumYearMutations } from '../hooks/cloud-flare/ReleaseYears/useAlbumYearMutations';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { usePagination } from '../hooks/usePagination';
import { usePipelineJob } from '../hooks/cloud-flare/usePipelineJob';
import { useStartPipeline } from '../hooks/cloud-flare/useStartPipeline';
import { AlbumYearArtistSection } from '../components/domain/ReleasedYear/AlbumYearArtistSection';
import { AlbumYearEditModal } from '../components/domain/ReleasedYear/AlbumYearEditModal';
import { AlbumYearCreateModal } from '../components/domain/ReleasedYear/AlbumYearCreateModal';
import { AlbumYearsFetchBar } from '../components/domain/ReleasedYear/AlbumYearsFetchBar';
import { AlbumYearsBatchModal } from '../components/domain/ReleasedYear/AlbumYearsBatchModal';
import { PipelineJobPanel } from '../components/domain/PipelineJobPanel';
import { Pagination } from '../components/ui/Pagination';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchBar } from '../components/ui/SearchBar';
import { BackLink } from '../components/layout/BackLink';

const PER_PAGE_SECTIONS = 15;
const FETCH_LIMIT = 2000;

export default function PublishedAlbumYears() {
  const mutations = useAlbumYearMutations();
  const { artists: allArtists = [] } = useCloudflareArtists();

  // ── Pipeline state ─────────────────────────────────────
  const pipeline = useStartPipeline();
  const [activeJobId, setActiveJobId] = useState(null);
  const { data: activeJob } = usePipelineJob(activeJobId);

  const isJobActive = activeJob &&
    (activeJob.status === 'running' || activeJob.status === 'starting');

  async function handleStartPipeline(payload) {
    const job = await pipeline.start(payload);
    setActiveJobId(job.id);
  }

  function handleCancelPipeline(id) {
    pipeline.cancel(id);
  }

  // ── Filters ────────────────────────────────────────────
  const [search, setSearch]             = useState('');
  const [artistFilter, setArtist]       = useState('');
  const [decadeFilter, setDecade]       = useState('');

  const filters = useMemo(() => ({
    search:    search || undefined,
    artist_id: artistFilter || undefined,
    limit:     FETCH_LIMIT,
  }), [search, artistFilter]);

  const { data, isLoading, error, refetch } = useAlbumYears(filters);
  const { data: stats } = useAlbumYearsStats();

  // ── Group rows by artist, apply decade filter client-side ──
  const sections = useMemo(() => {
    const rows = (data?.albumYears ?? []).filter(r => {
      if (!decadeFilter) return true;
      const decade = Math.floor(r.released_year / 10) * 10;
      return decade === Number(decadeFilter);
    });

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.artist_id)) {
        map.set(r.artist_id, {
          artistId:   r.artist_id,
          artistName: r.artist_name ?? `Artist #${r.artist_id}`,
          rows:       [],
        });
      }
      map.get(r.artist_id).rows.push(r);
    }
    for (const s of map.values()) {
      s.rows.sort((a, b) => a.released_year - b.released_year);
    }
    return [...map.values()].sort((a, b) => b.rows.length - a.rows.length);
  }, [data, decadeFilter]);

  // ── Pagination ─────────────────────────────────────────
  const filterKey = `${search}|${artistFilter}|${decadeFilter}`;
  const pg = usePagination(sections, {
    perPage: PER_PAGE_SECTIONS,
    resetKey: filterKey,
  });

  const artistOptions = useMemo(() => {
    if (allArtists.length > 0) {
      return allArtists
        .map(a => ({ id: a.id, name: a.name ?? `Artist #${a.id}` }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }
    return (stats?.perArtist ?? []).map(a => ({
      id:   a.artist_id,
      name: a.artist_name ?? `Artist #${a.artist_id}`,
    }));
  }, [allArtists, stats]);

  const decadeOptions = useMemo(() => {
    const rows = data?.albumYears ?? [];
    const set = new Set();
    for (const r of rows) {
      set.add(Math.floor(r.released_year / 10) * 10);
    }
    return [...set].sort((a, b) => b - a);
  }, [data]);

  // ── Modal state ────────────────────────────────────────
  const [editing, setEditing]       = useState(null);
  const [creating, setCreating]     = useState(false);
  const [batchOpen, setBatchOpen]   = useState(false);

  async function handleEditSubmit(payload) {
    await mutations.edit({
      id:           editing.id,
      albumName:    payload.album_name,
      releasedYear: payload.released_year,
    });
  }

  async function handleCreateSubmit(payload) {
    await mutations.create({
      artistId:     payload.artist_id,
      albumName:    payload.album_name,
      releasedYear: payload.released_year,
    });
  }

  async function handleDelete(row) {
    if (!confirm(`Delete "${row.album_name}" (${row.released_year})?`)) return;
    try { await mutations.remove({ id: row.id }); }
    catch (e) { console.error('[delete album year]', e); }
  }

  // ── Render ─────────────────────────────────────────────
  if (isLoading && !data) {
    return <LoadingBlock label="Loading album years…" />;
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

  const total   = stats?.total   ?? data?.total ?? 0;
  const artists = stats?.artists ?? 0;

  return (
    <div className="space-y-6 pb-32">
      <BackLink to="/">Home</BackLink>

      <AlbumYearsFetchBar
        onOpen={() => setBatchOpen(true)}
        disabled={!!isJobActive}
        starting={pipeline.isStarting}
      />

      {activeJob && (
        <PipelineJobPanel
          job={activeJob}
          onCancel={handleCancelPipeline}
          cancelling={pipeline.isCancelling}
        />
      )}

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Album Years</h1>
            <p className="text-sm text-ink-muted mt-1">
              {total} album{total === 1 ? '' : 's'} across {artists} artist{artists === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">{total} rows</Badge>
            <Button variant="primary" onClick={() => setCreating(true)}>
              Add album
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchBar
              initialValue={search}
              onSubmit={setSearch}
              placeholder="Filter by album or artist name…"
              submitLabel="Filter"
            />
          </div>

          <select
            value={artistFilter}
            onChange={e => setArtist(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All artists</option>
            {(stats?.perArtist ?? []).map(a => (
              <option key={a.artist_id} value={a.artist_id}>
                {a.artist_name ?? `Artist #${a.artist_id}`} ({a.total})
              </option>
            ))}
          </select>

          <select
            value={decadeFilter}
            onChange={e => setDecade(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All decades</option>
            {decadeOptions.map(d => (
              <option key={d} value={d}>{d}s</option>
            ))}
          </select>
        </div>
      </header>

      {sections.length === 0 ? (
        <EmptyState
          icon={total === 0 ? '✨' : '🔎'}
          title={total === 0 ? 'No album years in the database' : 'No matches'}
          description={
            total === 0
              ? 'Use "Fetch album years" to run the batch pipeline, or add an album manually.'
              : 'Try a different filter or search.'
          }
          action={
            total === 0 && (
              <Button variant="primary" onClick={() => setBatchOpen(true)}>
                Fetch album years
              </Button>
            )
          }
        />
      ) : (
        <>
          {pg.totalPages > 1 && (
            <div className="text-xs text-ink-subtle">
              Showing {pg.rangeStart}–{pg.rangeEnd} of {pg.totalItems} artists
            </div>
          )}

          <div className="space-y-4">
            {pg.pageItems.map(section => (
              <AlbumYearArtistSection
                key={section.artistId}
                section={section}
                onEdit={setEditing}
                onDelete={handleDelete}
                removingId={mutations.isRemoving ? mutations.removingId : null}
              />
            ))}
          </div>

          {pg.totalPages > 1 && (
            <Pagination {...pg} className="pt-2" />
          )}
        </>
      )}

      <AlbumYearEditModal
        key={editing ? editing.id : 'none'}
        open={!!editing}
        row={editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />

      <AlbumYearCreateModal
        open={creating}
        artists={artistOptions}
        onClose={() => setCreating(false)}
        onSubmit={handleCreateSubmit}
        submitting={mutations.isCreating}
        error={mutations.createError?.message ?? null}
      />

      <AlbumYearsBatchModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onStart={handleStartPipeline}
        starting={pipeline.isStarting}
      />
    </div>
  );
}