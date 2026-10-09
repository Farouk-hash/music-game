// src/components/ui/SelectAllToggle.jsx
//
// A small "Select all / Clear all" toggle for a list of items.
//
//   <SelectAllToggle
//     ids={tracks.map(t => t.id)}
//     selectedIds={selectedIds}
//     onChange={setSelectedIds}
//   />
//
// When every id in `ids` is selected, the button reads "Clear all" and
// clicking it removes them from `selectedIds`. Otherwise it reads
// "Select all" and adds them.

export function SelectAllToggle({
  ids,
  selectedIds,
  onChange,
  disabled = false,
  className = '',
  selectLabel = 'Select all',
  clearLabel = 'Clear all',
}) {
  if (!ids || ids.length === 0) return null;

  const allSelected = ids.every(id => selectedIds.has(id));

  function handleClick() {
    const next = new Set(selectedIds);
    if (allSelected) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={allSelected}
      className={[
        'inline-flex items-center gap-2 px-3 h-8 rounded-md border text-xs font-medium transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        allSelected
          ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
          : 'bg-surface-subtle border-surface-border text-ink-muted hover:border-brand-500/40 hover:text-ink',
        className,
      ].join(' ')}
    >
      {allSelected ? (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
          <path
            d="M4 4 L12 12 M12 4 L4 12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
          <path
            d="M3 8.5 L6.5 12 L13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {allSelected ? clearLabel : selectLabel}
    </button>
  );
}