// game/src/components/game/SkeletonTileGrid.jsx
import { Skeleton } from '../../ui/Skeleton.jsx';

export function SkeletonTileGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full" />
      ))}
    </div>
  );
}