import { useState, useMemo } from 'react';
import { Checkbox } from './Checkbox';

/**
 * Multi-select with search.
 *
 *   <MultiSelect
 *     label="Genres"
 *     options={[{ value: 5, label: 'راب' }, ...]}
 *     value={[5, 12]}                 // array of selected values
 *     onChange={(nextValues) => ...}
 *     placeholder="Search genres…"
 *   />
 */
export function MultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No matches',
  className = '',
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedSet = new Set(value);

  function toggle(val) {
    const next = selectedSet.has(val)
      ? value.filter(v => v !== val)
      : [...value, val];
    onChange?.(next);
  }

  // Show selected chips above the list
  const selectedOptions = options.filter(o => selectedSet.has(o.value));

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-ink">{label}</label>
      )}

      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 text-xs hover:bg-brand-500/25 transition-colors"
              title="Remove"
            >
              <span>{o.label}</span>
              <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={placeholder}
        className="
          w-full h-9 px-3 rounded-lg
          bg-surface-subtle text-ink placeholder:text-ink-subtle text-sm
          border border-surface-border
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
        "
      />

      {/* Options list */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-border bg-surface-subtle">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-ink-subtle text-center">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {filtered.map(o => {
              const checked = selectedSet.has(o.value);
              return (
                <li key={o.value}>
                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-muted transition-colors">
                    <Checkbox
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      size="sm"
                    />
                    <span className="text-sm text-ink truncate">{o.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}