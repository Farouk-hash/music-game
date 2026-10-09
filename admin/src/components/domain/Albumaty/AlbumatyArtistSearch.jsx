// admin/src/components/domain/AlbumatyArtistSearch.jsx
import { useMemo, useState } from 'react';
import { Button } from '../../ui/Button';

const PAGE_SIZE = 100;

/**
 * Normalize an Arabic name for comparison.
 * Unifies:
 *   - alef variants آ أ إ → ا
 *   - alef maqsura ى and hamza-yeh ئ → ي
 *   - ta marbuta ة → ه
 *   - strips diacritics (tashkeel) and tatweel
 */
function normalizeName(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/[\u0649\u0626]/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Full singer list with live filtering.
 *
 * Props:
 *   singers        — [{ id, name, url, categories }]
 *   onAdd          — (singer) => void
 *   alreadyAdded   — Set<albumatyId> of singers currently in the cart
 *   publishedNames — Set<string> of *normalized* D1 artist names
 */
export function AlbumatyArtistSearch({
  singers,
  onAdd,
  alreadyAdded,
  publishedNames,
}) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [publishedFilter, setPublishedFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pubSet = publishedNames ?? new Set();

    return singers.filter(s => {
      if (q) {
        const matchesText =
          s.name.toLowerCase().includes(q) ||
          String(s.id).includes(q);
        if (!matchesText) return false;
      }

      if (publishedFilter !== 'all') {
        const isPublished = pubSet.has(normalizeName(s.name));
        if (publishedFilter === 'published' && !isPublished) return false;
        if (publishedFilter === 'unpublished' && isPublished) return false;
      }

      return true;
    });
  }, [singers, query, publishedFilter, publishedNames]);

  const shown = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  function handleQueryChange(next) {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handlePublishedFilterChange(next) {
    setPublishedFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  const hasMore = filtered.length > visibleCount;

  const publishedCount = useMemo(() => {
    const pubSet = publishedNames ?? new Set();
    return singers.filter(s => pubSet.has(normalizeName(s.name))).length;
  }, [singers, publishedNames]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Filter by name or id…"
          className="
            w-full h-10 pr-10 pl-4
            bg-surface-subtle text-ink placeholder:text-ink-subtle
            border border-surface-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            transition-shadow
          "
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange('')}
            aria-label="Clear filter"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-subtle hover:text-ink transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={publishedFilter}
          onChange={e => handlePublishedFilterChange(e.target.value)}
          className="
            h-9 px-3 rounded-lg text-xs
            bg-surface-subtle text-ink
            border border-surface-border
            focus:outline-none focus:ring-2 focus:ring-brand-500
          "
        >
          <option value="all">All ({singers.length})</option>
          <option value="published">Published ({publishedCount})</option>
          <option value="unpublished">Not published ({singers.length - publishedCount})</option>
        </select>

        <span className="text-xs text-ink-subtle">
          {filtered.length} shown
        </span>
      </div>

      <div className="max-h-[28rem] overflow-y-auto border border-surface-border rounded-lg bg-surface-subtle">
        {shown.length === 0 && (
          <p className="text-xs text-ink-subtle text-center py-6">
            {query || publishedFilter !== 'all'
              ? 'No matches.'
              : 'No singers.'}
          </p>
        )}

        {shown.map(s => {
          const added = alreadyAdded.has(s.id);
          const isPublished = publishedNames?.has(normalizeName(s.name)) ?? false;

          return (
            <div
              key={s.id}
              className="flex items-center gap-3 px-3 py-2 border-b border-surface-border last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate" title={s.name}>
                  {s.name}
                  {isPublished && (
                    <span
                      className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 align-middle"
                      title="Already in D1"
                    >
                      published
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-ink-subtle">
                  albumaty #{s.id}
                  {Array.isArray(s.categories) && s.categories.length > 0 && (
                    <> · cat {s.categories.join(', ')}</>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant={added ? 'ghost' : 'secondary'}
                onClick={() => onAdd(s)}
                disabled={added}
              >
                {added ? 'Added' : isPublished ? 'Add again' : 'Add'}
              </Button>
            </div>
          );
        })}

        {hasMore && (
          <div className="p-3 text-center border-t border-surface-border">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            >
              Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}