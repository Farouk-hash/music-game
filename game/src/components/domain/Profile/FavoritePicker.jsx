// game/src/components/domain/Profile/FavoritePicker.jsx
import { useMemo, useState } from 'react';
import { SearchBar } from '../../ui/SearchBar.jsx';

/**
 * Inline picker for a list of favourite-able items.
 *
 * Props:
 *   items         — [{ id, label, subtitle? }]
 *   selectedIds   — Set of currently favourite ids
 *   onToggle(id)  — called when an item is clicked
 *   onClose()     — collapse the picker
 *   searchable    — show a search box (default true)
 *   emptyMessage
 *   placeholder
 *
 * Items are assumed to be pre-sorted by the caller.
 */
export function FavoritePicker({
  items = [],
  selectedIds,
  onToggle,
  onClose,
  searchable = true,
  placeholder = 'Search…',
  emptyMessage = 'Nothing to add.',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable) return items;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query, searchable]);

  return (
    <div className="rounded-md border border-border bg-surface-2 overflow-hidden">
      {searchable && (
        <div className="p-3 border-b border-border">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={placeholder}
          />
        </div>
      )}

      <div className="max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-subtle text-center py-6">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((it) => {
              const active = selectedIds.has(it.id);
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(it.id)}
                    aria-pressed={active}
                    className="
                      w-full text-left px-4 py-2.5
                      flex items-center justify-between gap-3
                      text-sm transition-colors
                      hover:bg-surface
                    "
                  >
                    <span className="flex-1 min-w-0 flex items-center gap-3">
                      <span
                        className={[
                          'flex h-5 w-5 items-center justify-center rounded border text-xs shrink-0',
                          active
                            ? 'bg-accent text-bg border-accent'
                            : 'border-border bg-surface text-transparent',
                        ].join(' ')}
                      >
                        ✓
                      </span>
                      <span className="truncate text-ink">{it.label}</span>
                    </span>
                    {it.subtitle && (
                      <span className="text-xs text-ink-subtle shrink-0">
                        {it.subtitle}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-2 border-t border-border flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ink-subtle hover:text-ink px-3 h-8"
        >
          Done
        </button>
      </div>
    </div>
  );
}