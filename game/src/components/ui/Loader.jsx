// game/src/components/ui/Loader.jsx
import { Skeleton } from './Skeleton.jsx';
import { Spinner, SpinnerMusicNote } from './Spinner.jsx';

export function Loader({
  variant = 'inline',
  size = 'md',
  label,
  icon = <SpinnerMusicNote />,  // <-- Default is now the SVG note
  count = 3,
  skeletonClassName = 'h-6 w-full',
  className = '',
}) {
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-ink-muted text-sm ${className}`}>
        <Spinner size={size} icon={icon} />
        {label && <span>{label}</span>}
      </div>
    );
  }

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
        <Spinner size="lg" icon={icon} />
        {label && <span>{label}</span>}
      </div>
    );
  }

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