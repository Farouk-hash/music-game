// game/src/components/layout/StatGrid.jsx
import { StatCard } from './StatCard.jsx';
import { Skeleton } from '../../ui/Skeleton.jsx';

export function StatGrid({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="relative rounded-lg border border-border bg-surface p-6 shadow-md">
            {/* Icon */}
            <Skeleton className="w-10 h-10 mb-5" rounded="md" />
            
            {/* Value */}
            <Skeleton className="h-10 w-24 mb-3" rounded="sm" />
            
            {/* Label */}
            <Skeleton className="h-3 w-16 mb-3" />
            
            {/* Description */}
            <div className="space-y-2 mt-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}