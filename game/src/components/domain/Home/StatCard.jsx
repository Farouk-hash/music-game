// game/src/components/layout/StatCard.jsx
export function StatCard({ label, value, description, icon }) {
  return (
    <div className="relative rounded-lg border border-border bg-surface p-4 shadow-md h-full flex flex-col justify-between">
      
      {/* Top row: Icon + Value Side-by-Side */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-accent shrink-0 scale-110">
          {icon}
        </div>
        <p className="text-3xl font-bold text-ink tabular-nums leading-none">
          {value?.toLocaleString('en-US') ?? '—'}
        </p>
      </div>

      {/* Bottom: Label & Description */}
      <div>
        <p className="text-[10px] font-semibold text-highlight uppercase tracking-[0.2em] mb-1">
          {label}
        </p>
        <p className="text-xs text-ink-muted leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}