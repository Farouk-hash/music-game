// game/src/components/domain/Sporcle/AutoCloseBar.jsx
//
// Countdown bar used for both:
//   • host alone in lobby (nobody joined)
//   • players present but nobody ready (can't start)
// Colour: green → yellow → red. Fires `onExpire` once.

import { useEffect, useRef, useState } from 'react';

export function AutoCloseBar({
  startedAt,
  durationMs,
  onExpire,
  label,
  sublabel,
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const remainingMs = Math.max(0, durationMs - (now - startedAt));
  const fraction = Math.min(1, remainingMs / durationMs);

  useEffect(() => {
    if (firedRef.current) return;
    if (remainingMs <= 0) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [remainingMs, onExpire]);

  const colour =
    fraction > 0.5
      ? 'bg-correct'
      : fraction > 0.2
      ? 'bg-highlight'
      : 'bg-wrong';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="text-ink-subtle tabular-nums">
          {Math.ceil(remainingMs / 1000)}s
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-[width] duration-200 ease-linear',
            colour,
          ].join(' ')}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      {sublabel && (
        <p className="text-[11px] text-ink-subtle text-center">
          {sublabel}
        </p>
      )}
    </div>
  );
}