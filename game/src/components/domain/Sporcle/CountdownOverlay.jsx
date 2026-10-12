// game/src/components/domain/Sporcle/CountdownOverlay.jsx
import { useEffect, useState } from 'react';

/**
 * Countdown timer driven by a server-supplied `endsAt` epoch.
 *
 * `inline` — render as a card inside a parent. Used by the Sporcle
 *            modal's room panel.
 * default  — full-screen overlay. Used by the game route when a refresh
 *            lands mid-countdown.
 */
export function CountdownOverlay({ endsAt, totalMs = 10000, inline = false }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const pct = totalMs > 0
    ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))
    : 0;

  const content = (
    <div
      className={[
        'rounded-lg border border-border bg-surface text-center space-y-6',
        inline ? 'p-8' : 'p-10 shadow-lg max-w-sm w-full',
      ].join(' ')}
    >
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.3em]">
        Get ready
      </p>

      <div className="flex items-center justify-center">
        <span
          className={[
            'font-extrabold leading-none text-ink tabular-nums',
            inline ? 'text-[6rem]' : 'text-[7rem]',
          ].join(' ')}
          aria-live="polite"
        >
          {remainingSec > 0 ? remainingSec : 'GO'}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-accent transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-sm text-ink-subtle">
        The first question is about to start.
      </p>
    </div>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4">
      {content}
    </div>
  );
}