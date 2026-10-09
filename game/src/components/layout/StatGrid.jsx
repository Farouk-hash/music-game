// game/src/components/layout/StatGrid.jsx
import { StatCard } from './StatCard.jsx';

export function StatGrid({ stats, isLoading }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} isLoading={isLoading} />
      ))}
    </div>
  );
}