// src/routes/GenrePicker.jsx
import { Link } from 'react-router-dom';
import { useGenres } from '../hooks/useGenres';
import { useCloudflareGenres } from '../hooks/cloud-flare/useCloudflareGenres';
import { useCloudflareGenreMutations } from '../hooks/cloud-flare/useCloudflareGenreMutations';
import { GenreGrid } from '../components/domain/GenreGrid';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function GenrePicker() {
  const { genres, count, loading, error } = useGenres();

  const {
    ids: publishedIds,
    count: publishedCount,
    loading: publishedLoading,
  } = useCloudflareGenres();

  const {
    push, remove,
    isPushing, isRemoving,
    pushingId, removingId,
  } = useCloudflareGenreMutations();

  const pendingIds = new Set();
  if (isPushing && pushingId != null) pendingIds.add(pushingId);
  if (isRemoving && removingId != null) pendingIds.add(removingId);

  async function handleToggleSync(genre, isCurrentlyPublished) {
    if (isCurrentlyPublished) return;   // checkbox is disabled once published
    try {
      await push({
        id: genre.id,
        name: genre.name,
        display_name: genre.display_name,
        image: genre.image ?? null,
        is_customized: 0,
      });
    } catch (e) {
      console.error('[toggleSync]', e);
    }
  }

  async function handleDelete(genre) {
    if (!confirm(`Delete "${genre.display_name}" from Cloudflare?`)) return;
    try {
      await remove(genre.id);
    } catch (e) {
      console.error('[delete]', e);
    }
  }

  if (loading) return <LoadingBlock label="Loading genres…" />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load genres"
        description={error.message}
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!genres.length) {
    return (
      <EmptyState
        icon="🎵"
        title="No genres found"
        description="The API returned an empty list."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Genres</h1>
          <p className="text-sm text-ink-muted mt-1">
            {count} {count === 1 ? 'genre' : 'genres'} from matb3aa
          </p>
          <p className="text-xs text-ink-subtle mt-1">
            Check a card to publish it. Manage published genres from{' '}
            <Link to="/published/genres" className="text-brand-500 hover:underline">
              Published Genres
            </Link>
            .
          </p>
        </div>
        <Badge variant="success">
          {publishedLoading ? '…' : `${publishedCount} published`}
        </Badge>
      </header>

      <GenreGrid
        genres={genres}
        syncedIds={publishedIds}
        pendingIds={pendingIds}
        onToggleSync={handleToggleSync}
        onDelete={handleDelete}
      />
    </div>
  );
}