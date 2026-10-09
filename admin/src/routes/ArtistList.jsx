// src/routes/ArtistList.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGenreArtists } from '../hooks/useGenreArtists';
import { useGenres } from '../hooks/useGenres';
import { useCloudflareGenres } from '../hooks/cloud-flare/useCloudflareGenres';
import { useCloudflareGenreMutations } from '../hooks/cloud-flare/useCloudflareGenreMutations';
import { useArtistAdmin } from '../hooks/cloud-flare/useArtistAdmin';
import { useAlphabeticalGroups } from '../hooks/useAlphabeticalGroups';
import { ArtistGrid } from '../components/domain/ArtistGrid';
import { ArtistModalFields } from '../components/domain/ArtistModalFields';
import { AlphabetFilter } from '../components/ui/AlphabetFilter';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ModalForm } from '../components/Modal/ModalForm';
import { BackLink } from '../components/layout/BackLink';

export default function ArtistList() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { genres: cloudflareGenres, loading: genresLoading } = useCloudflareGenres();
  const { genres: sourceGenres, loading: sourceLoading } = useGenres();
  const { push: pushGenre, isPushing: isPublishingGenre } = useCloudflareGenreMutations();

  // Find the genre in Cloudflare
  const matchedGenre = useMemo(
    () => cloudflareGenres.find(g => g.name === slug),
    [cloudflareGenres, slug]
  );

  // Find the same genre in matb3aa (source) for fallback
  const sourceGenre = useMemo(
    () => sourceGenres.find(g => g.name === slug),
    [sourceGenres, slug]
  );

  const isGenrePublished = matchedGenre != null;
  const genreId = matchedGenre?.id ?? sourceGenre?.id ?? null;

  const { artists, artistCount, trackCount, loading, error } = useGenreArtists(slug);

  // The admin hook — global fetch so published state reflects everywhere
  const admin = useArtistAdmin({
    genreId: null,
    defaultGenreIds: genreId ? [genreId] : [],
  });

  const [activeLetter, setActiveLetter] = useState(null);
  const groups = useAlphabeticalGroups(artists, { key: 'name' });
  const letters = groups.map(g => g.letter);
  const visibleArtists = activeLetter
    ? groups.find(g => g.letter === activeLetter)?.items ?? []
    : artists;

  const genreDisplay = sourceGenre?.display_name || slug?.replace(/-/g, ' ') || '';

  // ── Publish the genre inline ──────────────────────────
  async function handlePublishGenre() {
    if (!sourceGenre) return;
    try {
      await pushGenre({
        id: sourceGenre.id,
        name: sourceGenre.name,
        display_name: sourceGenre.display_name,
        image: sourceGenre.image ?? null,
        is_customized: 0,
      });
      // The Cloudflare genres query will invalidate and refetch automatically
      // thanks to TanStack — matchedGenre will populate on the next render
    } catch (e) {
      console.error('[publishGenre]', e);
    }
  }

  if (loading || genresLoading || sourceLoading) {
    return <LoadingBlock label="Loading artists…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load artists"
        description={error.message}
        action={<Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  // If the genre doesn't exist on matb3aa either, it's a truly invalid URL
  if (!sourceGenre && !matchedGenre) {
    return (
      <div className="space-y-6">
        <BackLink to="/genres">Back to genres</BackLink>
        <EmptyState
          icon="❓"
          title="Genre not found"
          description={`No genre matches "${slug}" on matb3aa.`}
          action={<Button onClick={() => navigate('/genres')}>Back to genres</Button>}
        />
      </div>
    );
  }

  const modalTitle = admin.isEditMode
    ? 'Edit Artist'
    : admin.source === 'custom'
      ? 'Add Custom Artist'
      : 'Publish Artist';

  return (
    <div className="space-y-10">
      <BackLink to="/genres">Back to genres</BackLink>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink capitalize">
            {genreDisplay}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {artistCount} {artistCount === 1 ? 'artist' : 'artists'} from matb3aa
            {trackCount > 0 && ` · ${trackCount} tracks scanned`}
          </p>
          <p className="text-xs text-ink-subtle mt-1">
            Click a card to publish it. Manage published artists from{' '}
            <Link to="/published/artists" className="text-brand-500 hover:underline">
              Published Artists
            </Link>
            .
          </p>
        </div>

        {isGenrePublished ? (
          <Badge variant="success">
            {admin.publishedLoading ? '…' : `${admin.publishedCount} published`}
          </Badge>
        ) : (
          <Badge variant="warning">Genre not published</Badge>
        )}
      </header>

      {/* ── Warning: genre not published ─────────────────── */}
      {!isGenrePublished && (
        <div className="card p-4 border border-warning/40 bg-warning-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-warning">
              This genre isn't in Cloudflare yet
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              Publish "{genreDisplay}" first, then you can publish its artists.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublishGenre}
            loading={isPublishingGenre}
            disabled={isPublishingGenre}
          >
            {isPublishingGenre ? 'Publishing…' : `Publish "${genreDisplay}"`}
          </Button>
        </div>
      )}

      {/* ── Source Artists ───────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Source Artists</h2>
            <p className="text-xs text-ink-muted">
              Fetched from matb3aa.
              {isGenrePublished
                ? ' Click a card to publish it to Cloudflare.'
                : ' Publish the genre first to enable publishing.'}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={admin.openCustom}
            disabled={!isGenrePublished}
          >
            + Add Custom Artist
          </Button>
        </div>

        {letters.length > 1 && (
          <AlphabetFilter
            letters={letters}
            active={activeLetter}
            onSelect={setActiveLetter}
          />
        )}

        {visibleArtists.length === 0 ? (
          <EmptyState
            icon="🔎"
            title={activeLetter ? `No artists starting with "${activeLetter}"` : 'No artists'}
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
      </section>

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