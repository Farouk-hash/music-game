// game/src/components/domain/Sporcle/SporcleTimer.jsx
import { useEffect, useState } from 'react';

/**
 * Server-authoritative timer bar.
 *
 * `deadline` is epoch ms. On mount and on every deadline change, we
 * start a local interval that recomputes remaining time. The server
 * decides when the question actually ends — this component is purely
 * cosmetic. It just gives the player a visible countdown.
 *
 * When the client's clock and the server's clock drift, the bar can
 * hit zero before the state updates. We clamp at zero and stop.
 */
export function SporcleTimer({ deadline, totalSeconds = 20 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;

  const remainingMs = Math.max(0, deadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const pct = totalSeconds > 0
    ? Math.min(100, (remainingMs / (totalSeconds * 1000)) * 100)
    : 0;

  // Color shifts red as we approach zero.
  const barColor =
    remainingSec <= 3 ? 'bg-wrong'
    : remainingSec <= 7 ? 'bg-highlight'
    : 'bg-accent';

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink-subtle uppercase tracking-[0.2em]">
          Time
        </span>
        <span
          className={[
            'text-2xl font-bold tabular-nums',
            remainingSec <= 3 ? 'text-wrong' : 'text-ink',
          ].join(' ')}
        >
          {remainingSec}s
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-[width] duration-200 ease-linear`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}