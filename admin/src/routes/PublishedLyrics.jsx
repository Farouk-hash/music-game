// src/routes/PublishedLyrics.jsx
import { useState, useMemo } from 'react';
import { useLyrics, useLyricsStats } from '../hooks/cloud-flare/useLyrics';
import { useLyricsMutations } from '../hooks/cloud-flare/useLyricsMutations';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { usePagination } from '../hooks/usePagination';
import { LyricsArtistSection } from '../components/domain/LyricsArtistSection';
import { LyricsEditModal } from '../components/domain/LyricsEditModal';
import { LyricsPreviewModal } from '../components/domain/LyricsPreviewModal';
import { BulkInsertLyricsModal } from '../components/domain/BulkInsertLyricsModal';
import { Pagination } from '../components/ui/Pagination';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchBar } from '../components/ui/SearchBar';
import { BackLink } from '../components/layout/BackLink';
import { usePipelineJob } from '../hooks/cloud-flare/usePipelineJob';
import { useStartPipeline } from '../hooks/cloud-flare/useStartPipeline';
import { FetchLyricsBar } from '../components/domain/FetchLyricsBar';
import { PipelineJobPanel } from '../components/domain/PipelineJobPanel';

const PER_PAGE_SECTIONS = 15;   // artist sections per page
const FETCH_LIMIT = 2000;        // rows per fetch

export default function PublishedLyrics() {
  const mutations = useLyricsMutations();
  const { artists: allArtists = [] } = useCloudflareArtists();

  const pipeline = useStartPipeline();
  const [activeJobId, setActiveJobId] = useState(null);
  const { data: activeJob } = usePipelineJob(activeJobId);

  const isJobActive = activeJob &&
    (activeJob.status === 'running' || activeJob.status === 'starting');

  async function handleStartPipeline(payload) {
    try {
      const job = await pipeline.start(payload);
      setActiveJobId(job.id);
    } catch (err) {
      console.error('[start pipeline]', err);
    }
  }

  function handleCancelPipeline(id) {
    pipeline.cancel(id);
  }

  // ── Filters ────────────────────────────────────────────
  const [search, setSearch]       = useState('');
  const [artistFilter, setArtist] = useState('');
  const [hasLyricsFilter, setHas] = useState('');

  const filters = useMemo(() => ({
    search: search || undefined,
    artist_id: artistFilter || undefined,
    has_lyrics: hasLyricsFilter === '' ? undefined : hasLyricsFilter,
    limit: FETCH_LIMIT,
  }), [search, artistFilter, hasLyricsFilter]);

  const { data, isLoading, error, refetch } = useLyrics(filters);
  const { data: stats } = useLyricsStats();

  // ── Group rows by artist ───────────────────────────────
  const sections = useMemo(() => {
    const rows = data?.lyrics ?? [];
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.artist_id)) {
        map.set(r.artist_id, {
          artistId: r.artist_id,
          artistName: r.artist_name ?? `Artist #${r.artist_id}`,
          rows: [],
        });
      }
      map.get(r.artist_id).rows.push(r);
    }
    return [...map.values()].sort((a, b) => b.rows.length - a.rows.length);
  }, [data]);

  // ── Pagination ─────────────────────────────────────────
  const filterKey = `${search}|${artistFilter}|${hasLyricsFilter}`;
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
      id: a.artist_id,
      name: a.artist_name ?? `Artist #${a.artist_id}`,
    }));
  }, [allArtists, stats]);

  // ── Modal state ────────────────────────────────────────
  const [editing, setEditing]   = useState(null);
  const [previewing, setPreview] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  async function handleEditSubmit(payload) {
    if (editing.id) {
      await mutations.edit({ id: editing.id, lyrics: payload.lyrics });
    } else {
      await mutations.create({
        artistId: editing.artist_id,
        trackName: editing.track_name,
        lyrics: payload.lyrics,
      });
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete lyrics for "${row.track_name}"?`)) return;
    try { await mutations.remove(row.id); }
    catch (e) { console.error('[delete lyrics]', e); }
  }

  async function handleBulkInsert(items) {
    return mutations.bulkInsertAsync(items);
  }

  // ── Render ─────────────────────────────────────────────
  if (isLoading && !data) {
    return <LoadingBlock label="Loading lyrics…" />;
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

  const total = stats?.total ?? data?.total ?? 0;
  const withLyrics = stats?.withLyrics ?? 0;
  const withoutLyrics = stats?.withoutLyrics ?? Math.max(0, total - withLyrics);

  return (
    <div className="space-y-6 pb-32">
      <BackLink to="/">Home</BackLink>

      <FetchLyricsBar
        artists={artistOptions}
        onStart={handleStartPipeline}
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
            <h1 className="text-2xl font-bold text-ink">Lyrics</h1>
            <p className="text-sm text-ink-muted mt-1">
              {withLyrics} with lyrics · {withoutLyrics} without · {total} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">{withLyrics} published</Badge>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              Bulk insert
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchBar
              initialValue={search}
              onSubmit={setSearch}
              placeholder="Filter by track name…"
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
                {a.artist_name ?? `Artist #${a.artist_id}`} ({a.with_lyrics}/{a.total})
              </option>
            ))}
          </select>

          <select
            value={hasLyricsFilter}
            onChange={e => setHas(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All</option>
            <option value="1">Has lyrics</option>
            <option value="0">No lyrics</option>
          </select>
        </div>
      </header>

      {sections.length === 0 ? (
        <EmptyState
          icon={total === 0 ? '✨' : '🔎'}
          title={total === 0 ? 'No lyrics in the database' : 'No matches'}
          description={
            total === 0
              ? 'Use "Bulk insert" to load lyrics from a JSON file.'
              : 'Try a different filter or search.'
          }
          action={
            total === 0 && (
              <Button variant="primary" onClick={() => setBulkOpen(true)}>
                Bulk insert
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
              <LyricsArtistSection
                key={section.artistId}
                section={section}
                onEdit={setEditing}
                onPreview={setPreview}
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

      <LyricsEditModal
        key={editing ? (editing.id ?? editing.track_name) : 'none'}
        open={!!editing}
        row={editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />

      <LyricsPreviewModal
        open={!!previewing}
        row={previewing}
        onClose={() => setPreview(null)}
      />

      <BulkInsertLyricsModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onBulkInsert={handleBulkInsert}
        inserting={mutations.isBulkInserting}
        error={mutations.bulkInsertError?.message ?? null}
      />
    </div>
  );
}