import { useState } from 'react';

/**
 * Search bar with explicit submit.
 *
 *   <SearchBar
 *     initialValue=""
 *     onSubmit={(query) => console.log(query)}
 *     placeholder="Search artists…"
 *   />
 *
 * - The input is uncontrolled internally, but the parent can pass
 *   `initialValue` to preset it.
 * - Pressing Enter or clicking the button triggers onSubmit with the
 *   trimmed value.
 * - The clear (✕) button resets the input and calls onSubmit('').
 */
export function SearchBar({
  initialValue = '',
  onSubmit,
  placeholder = 'Search…',
  submitLabel = 'Search',
  className = '',
  autoFocus = false,
}) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit?.(value.trim());
  }

  function handleClear() {
    setValue('');
    onSubmit?.('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 ${className}`}
      role="search"
    >
      {/* Input wrapper */}
      <div className="relative flex-1">
        <input
          type="search"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="
            w-full h-10 pr-10 pl-4
            bg-surface-subtle text-ink placeholder:text-ink-subtle
            border border-surface-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            transition-shadow
          "
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-subtle hover:text-ink transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="
          h-10 px-4 shrink-0
          bg-brand-500 text-white font-medium text-sm
          rounded-lg hover:bg-brand-600 active:bg-brand-700
          transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
        "
      >
        {submitLabel}
      </button>
    </form>
  );
}