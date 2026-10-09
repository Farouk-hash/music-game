// src/components/ui/AlphabetFilter.jsx

/**
 * Row of letter buttons for jumping to a group.
 *
 *   <AlphabetFilter
 *     letters={['ا', 'ب', 'ت', ...]}
 *     active={activeLetter}
 *     onSelect={(letter) => setActiveLetter(letter)}
 *   />
 */
export function AlphabetFilter({ letters, active, onSelect, className = '' }) {
  if (!letters?.length) return null;

  return (
    <div
      className={`flex flex-wrap gap-1 ${className}`}
      role="tablist"
      aria-label="Filter by first letter"
    >
      {letters.map(letter => {
        const isActive = letter === active;
        return (
          <button
            key={letter}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(isActive ? null : letter)}
            className={`
              min-w-8 h-8 px-2 rounded-md text-sm font-medium
              transition-colors
              ${isActive
                ? 'bg-brand-500 text-white'
                : 'bg-surface-subtle text-ink-muted hover:bg-surface-border hover:text-ink'}
            `}
          >
            {letter}
          </button>
        );
      })}

      {active && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Clear letter filter"
          className="
            min-w-8 h-8 px-2 rounded-md text-sm font-medium
            bg-surface border border-surface-border text-ink-muted
            hover:text-danger hover:border-danger/40
            transition-colors
          "
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}