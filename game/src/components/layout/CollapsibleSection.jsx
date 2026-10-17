// game/src/components/layout/CollapsibleSection.jsx
import { BorderContainer } from './BorderContainer.jsx';

export function CollapsibleSection({
  open,
  onToggle,
  title,
  icon,
  meta,
  actions,
  secondaryActions,
  children,
}) {
  const hasActions = Boolean(secondaryActions || actions);

  return (
    <BorderContainer border="all" className="p-3 sm:p-8 space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        
        {/* Title */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-1.5 sm:gap-2 text-left group shrink-0"
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

          {/* Mobile: Icon + Meta */}
          <span className="sm:hidden flex items-center gap-1.5">
            {icon && <span className="text-highlight shrink-0">{icon}</span>}
            {meta && <span className="text-xs text-ink-subtle font-normal">{meta}</span>}
          </span>

          {/* Desktop: Title + Meta */}
          <h2 className="hidden sm:flex items-center text-xs font-semibold text-highlight uppercase tracking-[0.2em] group-hover:text-ink transition-colors">
            {title}
            {meta && (
              <span className="text-xs text-ink-subtle normal-case tracking-normal font-normal ml-1">
                {meta}
              </span>
            )}
          </h2>
        </button>

        {/* Actions */}
        {hasActions && (
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
            {secondaryActions}
            {actions}
          </div>
        )}
      </div>

      {open && <div className="space-y-4">{children}</div>}
    </BorderContainer>
  );
}