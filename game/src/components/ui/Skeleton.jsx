// game/src/components/ui/Skeleton.jsx
//
// A single shimmering placeholder block. Compose several to build a
// skeleton for any layout.
//
//   <Skeleton className="h-8 w-32" />
//   <Skeleton className="aspect-[4/3] w-full rounded-md" />

export function Skeleton({ className = '', rounded = 'md' }) {
  const radiusClass =
    rounded === 'full' ? 'rounded-full' :
    rounded === 'lg'   ? 'rounded-lg'   :
    rounded === 'sm'   ? 'rounded-sm'   :
                         'rounded-md';

  return (
    <div
      aria-hidden
      className={[
        'bg-surface-2 animate-pulse',
        radiusClass,
        className,
      ].join(' ')}
    />
  );
}