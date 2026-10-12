// game/src/components/domain/Sporcle/LoadingOverlay.jsx
import { useEffect, useState } from 'react';

const MESSAGES = [
  'Loading questions…',
  'Picking tracks…',
  'Getting the audio ready…',
  'Almost there…',
];

/**
 * Loading indicator.
 *
 * `inline` — render as a card inside a parent (no fixed positioning).
 *            Used by the Sporcle modal's room panel.
 * default  — render as a full-screen overlay. Used by the game route
 *            when a refresh lands mid-loading.
 */
export function LoadingOverlay({ inline = false }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % MESSAGES.length);
    }, 1500);
    return () => clearInterval(id);
  }, []);

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
        <div className="h-12 w-12 rounded-full border-4 border-accent-2 border-t-accent animate-spin" />
      </div>

      <p className="text-sm text-ink-muted transition-opacity duration-300" aria-live="polite">
        {MESSAGES[index]}
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