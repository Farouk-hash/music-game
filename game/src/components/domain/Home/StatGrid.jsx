// game/src/components/layout/StatGrid.jsx
import { StatCard } from './StatCard.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';

const MARQUEE_CSS = `
  @keyframes scroll-marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-stat-marquee {
    animation: scroll-marquee 50s linear infinite;
  }
  .pause-on-hover:hover .animate-stat-marquee {
    animation-play-state: paused;
  }
`;

export function StatGrid({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="relative w-full overflow-hidden py-4">
        <div className="flex gap-4 w-max">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-64 sm:w-72 shrink-0 rounded-lg border border-border bg-surface p-6 shadow-md">
              <Skeleton className="w-10 h-10 mb-5" rounded="md" />
              <Skeleton className="h-10 w-24 mb-3" rounded="sm" />
              <Skeleton className="h-3 w-16 mb-3" />
              <div className="space-y-2 mt-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Duplicate the stats to create a seamless loop
  const loopStats = [...stats, ...stats];

  return (
    <>
      <style>{MARQUEE_CSS}</style>
      <div className="relative w-full overflow-hidden pause-on-hover py-4">
      
        <div className="flex animate-stat-marquee gap-4 w-max">
          {loopStats.map((s, i) => (
            <div key={`${s.label}-${i}`} className="w-64 sm:w-72 shrink-0">
              <StatCard {...s} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}