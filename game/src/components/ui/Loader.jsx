// game/src/components/ui/Loader.jsx
import { Skeleton } from './Skeleton.jsx';

const SPINNER_SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      aria-hidden
      className={[
        'inline-block rounded-full',
        'border-accent/30 border-t-accent',
        'animate-spin',
        SPINNER_SIZES[size] ?? SPINNER_SIZES.md,
        className,
      ].join(' ')}
    />
  );
}

/**
 * Loading placeholder. Three variants:
 *
 *   <Loader />                              // inline spinner, no label
 *   <Loader label="Loading…" />             // inline spinner + label
 *   <Loader variant="page" label="…" />     // centered, full page
 *   <Loader variant="skeleton" count={4}
 *           skeletonClassName="h-8 w-32" /> // N shimmering blocks
 *
 * The `skeleton` variant renders a grid of identical Skeleton blocks.
 * For finer control, compose `<Skeleton>` directly instead.
 */
export function Loader({
  variant = 'inline',      // 'inline' | 'page' | 'skeleton'
  size = 'md',             // 'sm' | 'md' | 'lg'
  label,
  count = 3,               // for skeleton variant
  skeletonClassName = 'h-6 w-full',
  className = '',
}) {
  // ── Inline ────────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-ink-muted text-sm ${className}`}>
        <Spinner size={size} />
        {label && <span>{label}</span>}
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────
  if (variant === 'page') {
    return (
      <div
        className={[
          'flex flex-col items-center justify-center gap-3',
          'min-h-[200px] py-16',
          'text-ink-muted text-sm',
          className,
        ].join(' ')}
      >
        <Spinner size="lg" />
        {label && <span>{label}</span>}
      </div>
    );
  }

  // ── Skeleton ──────────────────────────────────────────
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className={skeletonClassName} />
        ))}
      </div>
    );
  }

  return null;
}