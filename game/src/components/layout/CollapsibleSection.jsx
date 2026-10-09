// game/src/components/layout/CollapsibleSection.jsx
import { BorderContainer } from './BorderContainer.jsx';

/**
 * A bordered section with a clickable header that toggles visibility
 * of its body. Replaces the raw <BorderContainer border="all" className="p-8">
 * pattern for sections that should be collapsible.
 *
 *   <CollapsibleSection
 *     open={genresOpen}
 *     onToggle={() => setGenresOpen(o => !o)}
 *     title="Genres"
 *     meta={genreMode === 'some' ? `(${selectedGenres.size})` : null}
 *     actions={<button>All genres</button>}
 *   >
 *     <GenreTileGrid ... />
 *   </CollapsibleSection>
 */
export function CollapsibleSection({
  open,
  onToggle,
  title,
  meta,
  actions,
  children,
}) {
  return (
    <BorderContainer border="all" className="p-8 space-y-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-2 text-left group"
        >
          <svg
            viewBox="0 0 16 16"
            className={[
              'w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-ink-subtle group-hover:text-ink',
              open ? 'rotate-0' : '-rotate-90',
            ].join(' ')}
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6 L8 10 L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em] group-hover:text-ink transition-colors">
            {title}
            {meta && (
              <span className="text-xs text-ink-subtle normal-case tracking-normal font-normal ml-1">
                {meta}
              </span>
            )}
          </h2>
        </button>

        {actions && (
          <div className="flex items-center gap-4">
            {actions}
          </div>
        )}
      </div>

      {open && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </BorderContainer>
  );
}