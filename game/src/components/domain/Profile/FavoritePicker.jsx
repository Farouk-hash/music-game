import { useMemo, useState } from 'react';
import { SearchBar } from '../../ui/SearchBar.jsx';
import { IconWifiOff } from '@/icons/index.js'; // ✅ Import for visual feedback

/**
 * Inline picker for a list of favourite-able items.
 *
 * Props:
 *   items         — [{ id, label, subtitle? }]
 *   selectedIds   — Set of currently favourite ids
 *   onToggle(id)  — called when an item is clicked (safe-guarded by parent)
 *   onClose()     — collapse the picker
 *   searchable    — show a search box (default true)
 *   emptyMessage
 *   placeholder
 *   disabled      — if true, prevents interaction and shows offline state
 */
export function FavoritePicker({
  items = [],
  selectedIds,
  onToggle,
  onClose,
  searchable = true,
  placeholder = 'Search…',
  emptyMessage = 'Nothing to add.',
  disabled = false, // ✅ NEW PROP
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable) return items;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query, searchable]);

  return (
    <div className={`rounded-md border border-border bg-surface-2 overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      {searchable && (
        <div className="p-3 border-b border-border">
          <SearchBar
            value={query}
            onChange={(v) => !disabled && setQuery(v)} // ✅ Prevent typing when disabled
            placeholder={placeholder}
            disabled={disabled} // ✅ Pass disabled state to input
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
                    onClick={() => !disabled && onToggle(it.id)} // ✅ Guard toggle
                    aria-pressed={active}
                    disabled={disabled}
                    className={`
                      w-full text-left px-4 py-2.5
                      flex items-center justify-between gap-3
                      text-sm transition-colors
                      ${disabled 
                        ? 'cursor-not-allowed text-ink-subtle' 
                        : 'hover:bg-surface cursor-pointer'}
                    `}
                  >
                    <span className="flex-1 min-w-0 flex items-center gap-3">
                      <span
                        className={[
                          'flex h-5 w-5 items-center justify-center rounded border text-xs shrink-0',
                          active
                            ? 'bg-accent text-bg border-accent'
                            : 'border-border bg-surface text-transparent',
                          disabled && 'opacity-50'
                        ].join(' ')}
                      >
                        ✓
                      </span>
                      <span className={`truncate ${disabled ? 'text-ink-subtle' : 'text-ink'}`}>
                        {it.label}
                      </span>
                    </span>
                    {it.subtitle && (
                      <span className={`text-xs shrink-0 ${disabled ? 'text-ink-subtle/50' : 'text-ink-subtle'}`}>
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
          disabled={disabled}
          className={`text-xs px-3 h-8 transition-colors ${
            disabled 
              ? 'text-ink-subtle/50 cursor-not-allowed' 
              : 'text-ink-subtle hover:text-ink'
          }`}
        >
          {disabled ? (
            <span className="inline-flex items-center gap-1.5">
              <IconWifiOff className="w-3 h-3" /> Offline
            </span>
          ) : 'Done'}
        </button>
      </div>
    </div>
  );
}