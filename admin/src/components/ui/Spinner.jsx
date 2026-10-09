
const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export function Spinner({ size = 'md', className = '' }) {
  const classes = [
    'inline-block rounded-full border-current border-t-transparent animate-spin',
    sizes[size],
    className,
  ].filter(Boolean).join(' ');
  return <span className={classes} role="status" aria-label="Loading" />;
}

/** A centered spinner with optional label — for full-page loading states */
export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink-muted">
      <Spinner size="lg" />
      <span className="text-sm">{label}</span>
    </div>
  );
}