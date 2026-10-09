// game/src/components/ui/SearchBar.jsx
//
// Controlled search input. The parent owns the query and decides what
// to do with it. No filtering logic lives here — that belongs to the
// page that knows what it's searching through.
//
//   <SearchBar
//     value={q}
//     onChange={setQ}
//     placeholder="Search artists…"
//     onClear={() => setQ('')}
//   />

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search…',
  onClear,
  disabled = false,
  className = '',
  autoFocus = false,
}) {
  const hasValue = value.length > 0;

  function handleChange(e) {
    onChange?.(e.target.value);
  }

  function handleClear() {
    if (onClear) onClear();
    else onChange?.('');
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-ink-subtle">
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={[
          'w-full h-10 pl-9 pr-9 rounded-md',
          'bg-surface-2 text-ink placeholder:text-ink-subtle',
          'border border-border',
          'focus:border-accent focus:outline-none',
          'transition-colors',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        ].join(' ')}
      />

      {/* Clear button */}
      {hasValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-2 flex items-center px-2 text-ink-subtle hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
            <path
              d="M4 4 L12 12 M12 4 L4 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}