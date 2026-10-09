import { Loader } from "../ui/Loader";

// game/src/components/layout/StatCard.jsx
export function StatCard({ icon, value, label, description, isLoading }) {
  return (
    <div className="
      relative rounded-lg border border-border bg-surface p-6
      shadow-md hover:border-accent-2 transition-colors
    ">
      {/* Icon */}
      <div className="w-10 h-10 rounded-md bg-accent-soft text-accent
                      flex items-center justify-center mb-5">
        {icon}
      </div>

      {/* Value */}
      <p className="text-4xl font-bold tabular-nums text-ink leading-none">
        {isLoading || value == null ? (
          <Loader variant="inline" label="Loading catalogue…" />
        ) : (
          value.toLocaleString('en-US')
        )}
      </p>

      {/* Label */}
      <p className="text-[11px] uppercase tracking-[0.18em] text-highlight mt-3 font-semibold">
        {label}
      </p>

      {/* Description */}
      {description && (
        <p className="text-sm text-ink-muted mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}