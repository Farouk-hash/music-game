export function TimerBar({ timeLeft, total, timedOut }) {
  if (!total || total <= 0) return null;

  const pct = Math.max(0, Math.min(1, timeLeft / total)) * 100;
  const urgent = timeLeft / total <= 0.25;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={urgent ? 'text-wrong font-medium' : 'text-ink-muted'}>
          {timedOut ? "Time's up" : 'Time'}
        </span>
        <span className={`tabular-nums ${urgent ? 'text-wrong font-semibold' : 'text-ink-muted'}`}>
          {Math.ceil(timeLeft)}s
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-200 ${
            urgent ? 'bg-wrong' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}