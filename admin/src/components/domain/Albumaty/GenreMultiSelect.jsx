// admin/src/components/domain/GenreMultiSelect.jsx
import { useEffect, useRef, useState } from 'react';

/**
 * Compact dropdown with checkboxes for multi-selecting genres.
 *
 *   <GenreMultiSelect
 *     genres={genres}            // [{ id, display_name, name, ... }]
 *     value={[45, 12]}           // array of numeric ids
 *     onChange={(next) => ...}   // called with new array of ids
 *     placeholder="Pick genres…"
 *   />
 */
export function GenreMultiSelect({
  genres,
  value = [],
  onChange,
  placeholder = 'Pick genres…',
  disabled = false,
  maxLabelWidth = 'w-56',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedSet = new Set(value);
  const selectedGenres = genres.filter(g => selectedSet.has(g.id));

  const filtered = query.trim()
    ? genres.filter(g => {
        const q = query.trim().toLowerCase();
        return (
          String(g.id).includes(q) ||
          (g.display_name ?? g.name ?? '').toLowerCase().includes(q)
        );
      })
    : genres;

  function toggle(id) {
    const next = selectedSet.has(id)
      ? value.filter(v => v !== id)
      : [...value, id];
    onChange(next);
  }

  const label =
    selectedGenres.length === 0
      ? placeholder
      : selectedGenres.map(g => g.display_name ?? g.name ?? g.id).join(', ');

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`
          ${maxLabelWidth} h-8 px-2 rounded-md
          bg-surface-subtle text-ink text-xs
          border border-surface-border
          flex items-center gap-1 text-left
          hover:border-brand-500 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate flex-1">
          {label}
        </span>
        <span className="text-ink-subtle shrink-0">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-64 rounded-md border border-surface-border bg-surface shadow-lg overflow-hidden">
          <div className="p-2 border-b border-surface-border">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter genres…"
              autoFocus
              className="
                w-full h-8 px-2 rounded-md
                bg-surface-subtle text-ink text-xs
                border border-surface-border
                focus:outline-none focus:ring-1 focus:ring-brand-500
              "
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-ink-subtle text-center py-3">
                No genres.
              </p>
            )}
            {filtered.map(g => {
              const checked = selectedSet.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs
                    hover:bg-surface-subtle transition-colors
                    ${checked ? 'bg-brand-500/10' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="pointer-events-none"
                    tabIndex={-1}
                  />
                  <span className="flex-1 truncate text-ink">
                    {g.display_name ?? g.name ?? `Genre #${g.id}`}
                  </span>
                  <span className="text-[10px] text-ink-subtle tabular-nums">
                    #{g.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-surface-border flex items-center justify-between text-[10px]">
            <span className="text-ink-subtle">
              {value.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(genres.map(g => g.id))}
                className="text-brand-400 hover:text-brand-500"
              >
                All
              </button>
              <span className="text-ink-subtle">·</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-ink-muted hover:text-ink"
              >
                None
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}