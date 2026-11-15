// admin/src/components/domain/Templates/ArtistSelector.jsx
import { useMemo, useState } from 'react';
import { useAdminCatalog } from '../../../hooks/cloud-flare/Templates/useAdminCatalog';
import { ArtistGrid } from '../ArtistGrid';
import { SearchBar } from '../../ui/SearchBar';
import { LoadingBlock } from '../../ui/Spinner';

export function ArtistSelector({ genresSelected, selectedIds, onToggle }) {
  const { artists, loading } = useAdminCatalog();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artists.filter(a => {
      if (genresSelected.size > 0) {
        const genreIds = a.genre_ids ?? [];
        const matchesGenre = genreIds.some(id => genresSelected.has(id));
        if (!matchesGenre) return false;
      }
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [artists, genresSelected, search]);

  if (genresSelected.size === 0) {
    return (
      <p className="text-sm text-ink-muted py-6 text-center border border-surface-border border-dashed rounded-md">
        Pick at least one genre to see artists.
      </p>
    );
  }

  if (loading && !artists.length) {
    return <LoadingBlock label="Loading artists…" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            initialValue={search}
            onSubmit={setSearch}
            placeholder="Filter artists…"
            submitLabel="Filter"
          />
        </div>
        <span className="text-xs text-ink-subtle">
          {selectedIds.size} selected
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center border border-surface-border border-dashed rounded-md">
          No artists match the current filter.
        </p>
      ) : (
        <ArtistGrid
          artists={filtered}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={(artist) => onToggle(artist.id)}
        />
      )}
    </div>
  );
}