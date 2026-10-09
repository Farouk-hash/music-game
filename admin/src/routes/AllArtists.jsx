// src/routes/AllArtists.jsx
import { useState, useEffect, useRef } from 'react';
import { useArtistSearch } from '../hooks/useArtistSearch';
import { useArtistAdmin } from '../hooks/cloud-flare/useArtistAdmin';
import { useAlphabeticalGroups } from '../hooks/useAlphabeticalGroups';
import { ArtistGrid } from '../components/domain/ArtistGrid';
import { ArtistModalFields } from '../components/domain/ArtistModalFields';
import { AlphabetFilter } from '../components/ui/AlphabetFilter';
import { Pagination } from '../components/ui/Pagination';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ModalForm } from '../components/Modal/ModalForm';
import { BackLink } from '../components/layout/BackLink';

export default function AllArtists() {
const f = useArtistSearch({ perPage: 100 }); 
  const [activeLetter, setActiveLetter] = useState(null);

  // Admin modal + published set (global — no genreId filter)
  const admin = useArtistAdmin({ genreId: null, defaultGenreIds: [] });

  const groups = useAlphabeticalGroups(f.artists, { key: 'name' });
  const letters = groups.map(g => g.letter);

  const visibleArtists = activeLetter
    ? groups.find(g => g.letter === activeLetter)?.items ?? []
    : f.artists;

  const prevQueryRef = useRef(f.searchQuery);
  useEffect(() => {
    if (prevQueryRef.current !== f.searchQuery) {
      prevQueryRef.current = f.searchQuery;
      setActiveLetter(null);
    }
  }, [f.searchQuery]);

  if (f.loading && !f.artists.length && !f.isSearching) {
    return <LoadingBlock label="Loading artists…" />;
  }

  if (f.error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load artists"
        description={f.error.message}
        action={<Button variant="secondary" onClick={() => f.setPage(1)}>Retry</Button>}
      />
    );
  }

  // Modal title varies by context
  const modalTitle = admin.isEditMode
    ? 'Edit Artist'
    : admin.source === 'custom'
      ? 'Add Custom Artist'
      : 'Publish Artist';

  return (
    <div className="space-y-6">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">All Artists</h1>
            <p className="text-sm text-ink-muted mt-1">
              {f.isSearching ? (
                <>
                  Search results for{' '}
                  <span className="text-ink font-medium">"{f.searchQuery}"</span>
                  {f.artists.length > 0 && ` · ${f.artists.length} on this page`}
                </>
              ) : f.totalItems != null ? (
                `${f.totalItems} artists total · page ${f.page} of ${f.totalPages}`
              ) : (
                `Newest first · page ${f.page}`
              )}
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              Click any card to publish or edit it in Cloudflare.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success">
              {admin.publishedLoading ? '…' : `${admin.publishedCount} published`}
            </Badge>
            <Button variant="primary" size="sm" onClick={admin.openCustom}>
              + Add Custom Artist
            </Button>
            {f.loading && f.artists.length > 0 && (
              <span className="text-xs text-ink-subtle">Refreshing…</span>
            )}
          </div>
        </div>

        <SearchBar
          initialValue={f.searchQuery}
          onSubmit={f.setSearchQuery}
          placeholder="Search artists by name…"
          submitLabel="Search"
        />

        {letters.length > 1 && (
          <AlphabetFilter
            letters={letters}
            active={activeLetter}
            onSelect={setActiveLetter}
          />
        )}
      </header>

      {visibleArtists.length === 0 && !f.loading ? (
        <EmptyState
          icon="🔎"
          title={activeLetter ? `No artists starting with "${activeLetter}"` : 'No artists found'}
        />
      ) : (
        <ArtistGrid
          artists={visibleArtists}
          syncedIds={admin.publishedIds}
          pendingIds={admin.pendingIds}
          onEdit={admin.openFor}
          onDelete={admin.removeArtist}
        />
      )}

      {f.artists.length > 0 && !activeLetter && (
        <Pagination
          page={f.page}
          totalPages={f.totalPages}
          hasPrev={f.hasPrev}
          hasNext={f.hasNext}
          onPrev={f.goPrev}
          onNext={f.goNext}
          onPage={f.setPage}
          className="pt-4"
        />
      )}

      {/* Modal */}
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
    </div>
  );
}