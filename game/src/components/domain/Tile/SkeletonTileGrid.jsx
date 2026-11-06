// game/src/components/game/SkeletonTileGrid.jsx
import { Skeleton } from '@/components/ui/Skeleton.jsx';

export function SkeletonTileGrid({ count = 8, view = 'grid' }) {
  const containerClass =
    view === 'list'
      ? 'flex flex-col gap-2'
      : view === 'dense'
      ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4';

  const skeletonClass =
    view === 'list'
      ? 'h-[68px] w-full' // list rows are ~68px tall (12*4 image + padding)
      : view === 'dense'
      ? 'aspect-square w-full'
      : 'aspect-[4/3] w-full';

  return (
    <div className={containerClass}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={skeletonClass} />
      ))}
    </div>
  );
}