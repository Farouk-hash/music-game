// admin/src/components/domain/Templates/GenreSelector.jsx
import { useMemo, useState } from 'react';
import { useAdminCatalog } from '../../../hooks/cloud-flare/Templates/useAdminCatalog';
import { SearchBar } from '../../ui/SearchBar';
import { LoadingBlock } from '../../ui/Spinner';

export function GenreSelector({ selectedIds, onToggle }) {
  const { genres, loading } = useAdminCatalog();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter(g =>
      (g.display_name || g.name).toLowerCase().includes(q)
    );
  }, [genres, search]);

  if (loading && !genres.length) {
    return <LoadingBlock label="Loading genres…" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            initialValue={search}
            onSubmit={setSearch}
            placeholder="Filter genres…"
            submitLabel="Filter"
          />
        </div>
        <span className="text-xs text-ink-subtle">
          {selectedIds.size} selected
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center border border-surface-border border-dashed rounded-md">
          No genres match "{search}".
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map(g => {
            const active = selectedIds.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onToggle(g.id)}
                aria-pressed={active}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left transition-colors',
                  active
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-surface-subtle text-ink-muted border-surface-border hover:border-brand-500 hover:text-ink',
                ].join(' ')}
              >
                {g.image ? (
                  <img src={g.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-surface flex items-center justify-center text-xs font-bold shrink-0">
                    {(g.display_name || g.name).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate">{g.display_name || g.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}