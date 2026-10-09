// src/routes/PublishedArtists.jsx
import { useCallback, useMemo, useState } from 'react';
import { useCloudflareArtists } from '../hooks/cloud-flare/useCloudflareArtists';
import { useCloudflareGenres } from '../hooks/cloud-flare/useCloudflareGenres';
import { useArtistAdmin } from '../hooks/cloud-flare/useArtistAdmin';
import { usePagination } from '../hooks/usePagination';
import { ArtistGrid } from '../components/domain/ArtistGrid';
import { ArtistModalFields } from '../components/domain/ArtistModalFields';
import { BulkPublishArtistsBar } from '../components/domain/BulkPublishArtistsBar';
import { BulkPublishArtistFlow } from '../components/domain/BulkPublishArtistFlow';
import { Pagination } from '../components/ui/Pagination';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ModalForm } from '../components/Modal/ModalForm';
import { BackLink } from '../components/layout/BackLink';
import { artistDetailPath } from '../lib/quran';

const PER_PAGE = 60;

export default function PublishedArtists() {
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [clipFilter, setClipFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [selectedArtistIds, setSelectedArtistIds] = useState(() => new Set());
  const [bulkFlowOpen, setBulkFlowOpen] = useState(false);

  const { genres: cloudflareGenres } = useCloudflareGenres();
  const { artists, loading, error, count } = useCloudflareArtists({
    genreId: genreFilter || null,
    source: sourceFilter,
  });


  // Client-side filter: search + clip state
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artists.filter(a => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (clipFilter !== 'all') {
        const hasClips = (a.tracks_count ?? 0) > 0;
        if (clipFilter === 'with' && !hasClips) return false;
        if (clipFilter === 'without' && hasClips) return false;
      }
      return true;
    });
  }, [artists, search, clipFilter]);

  // Pagination
  const filterKey = `${search}|${genreFilter}|${sourceFilter}|${clipFilter}`;
  const pg = usePagination(filtered, {
    perPage: PER_PAGE,
    resetKey: filterKey,
  });

  const admin = useArtistAdmin({ genreId: genreFilter || null });

  const modalTitle = admin.isEditMode
    ? 'Edit Artist'
    : admin.source === 'custom'
      ? 'Add Custom Artist'
      : 'Publish Artist';

  const detailHrefFor = useCallback(
    (artist) => artistDetailPath(artist),
    []
  );


  const toggleArtistSelection = useCallback((artist) => {
    setSelectedArtistIds(prev => {
      const next = new Set(prev);
      if (next.has(artist.id)) next.delete(artist.id);
      else next.add(artist.id);
      return next;
    });
  }, []);

  const clearArtistSelection = useCallback(() => {
    setSelectedArtistIds(new Set());
  }, []);

  const selectedArtists = useMemo(
    () => artists.filter(a => selectedArtistIds.has(a.id)),
    [artists, selectedArtistIds]
  );

  function handleOpenBulkFlow() {
    if (selectedArtists.length === 0) return;
    setBulkFlowOpen(true);
  }

  function handleCloseBulkFlow() {
    setBulkFlowOpen(false);
    clearArtistSelection();
  }

  return (
    <div className="space-y-6 pb-24">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Published Artists</h1>
            <p className="text-sm text-ink-muted mt-1">
              {loading
                ? 'Loading…'
                : `${count} ${count === 1 ? 'artist' : 'artists'} live in Cloudflare`}
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              Click any card to edit or delete. Tick cards to bulk-publish all their clips.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success">{count} published</Badge>
            <Button variant="primary" size="sm" onClick={admin.openCustom}>
              + Add Custom Artist
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchBar
              initialValue={search}
              onSubmit={setSearch}
              placeholder="Filter by name…"
              submitLabel="Filter"
            />
          </div>

          <select
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All genres</option>
            {cloudflareGenres.map(g => (
              <option key={g.id} value={g.id}>
                {g.display_name || g.name}
              </option>
            ))}
          </select>

          <select
            value={clipFilter}
            onChange={e => setClipFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All artists</option>
            <option value="with">Has clips</option>
            <option value="without">No clips</option>
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-subtle text-ink text-sm border border-surface-border focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All sources</option>
            <option value="matb3aa">matb3aa</option>
            <option value="albumaty">albumaty</option>
            <option value="mp3quran">quran</option>
          </select>
        </div>
      </header>

      <BulkPublishArtistsBar
        count={selectedArtistIds.size}
        onClear={clearArtistSelection}
        onPublish={handleOpenBulkFlow}
      />

      {loading && !artists.length ? (
        <LoadingBlock label="Loading published artists…" />
      ) : error ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load"
          description={error.message}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="✨"
          title={artists.length === 0 ? 'Nothing published yet' : 'No matches'}
          description={
            artists.length === 0
              ? 'Publish artists from a genre page, or add custom ones.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <>
          {pg.totalPages > 1 && (
            <div className="text-xs text-ink-subtle">
              Showing {pg.rangeStart}–{pg.rangeEnd} of {pg.totalItems} artists
            </div>
          )}

          <ArtistGrid
            artists={pg.pageItems}
            syncedIds={admin.publishedIds}
            pendingIds={admin.pendingIds}
            onEdit={admin.openFor}
            onDelete={admin.removeArtist}
            detailHrefFor={detailHrefFor}
            selectable
            selectedIds={selectedArtistIds}
            onToggleSelect={toggleArtistSelection}
          />

          {pg.totalPages > 1 && (
            <Pagination {...pg} className="pt-4" />
          )}
        </>
      )}

      <ModalForm
        open={admin.isModalOpen}
        onClose={admin.close}
        title={modalTitle}
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

      {bulkFlowOpen && (
        <BulkPublishArtistFlow
          open
          onClose={handleCloseBulkFlow}
          artists={selectedArtists}
          autoStart
        />
      )}
    </div>
  );
}