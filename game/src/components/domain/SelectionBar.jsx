// game/src/components/game/SelectionBar.jsx
//
// Sticky bottom bar. Renders a summary of the current selection plus an
// arbitrary list of action buttons.
//
//   actions = [
//     { key: 'play-two', label: 'Play level 2', onClick, variant: 'ghost' },
//     { key: 'play-one', label: 'Play level 1', onClick, variant: 'primary' },
//   ]
//
// Wide screens (sm+): inline buttons on the right.
// Small screens: a hamburger icon opens a bottom sheet listing the
// actions as full-width buttons, primary action at the top.

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button.jsx';

const VARIANT_CLASS = {
  primary:
    'bg-accent text-bg border-accent hover:bg-accent-2',
  secondary:
    'bg-surface-2 text-ink border-border hover:border-accent-2',
  ghost:
    'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
  danger:
    'bg-surface-2 text-wrong border-wrong/40 hover:border-wrong',
};

function MenuIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function SelectionBar({
  count,
  countLabel = 'selected',
  hint,
  actions = [],
}) {
  const [open, setOpen] = useState(false);

  // Escape key closes the sheet.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleAction(action) {
    action.onClick?.();
    setOpen(false);
  }

  // Primary at top, then the rest as given. The array passed by the
  // caller has primary last (Setup sends [multiplayer, l3, l2, l1]),
  // so reverse for the sheet.
  const sheetActions = [...actions].reverse();

  return (
    <>
      {/* Backdrop — only when the sheet is open on small screens */}
      {open && (
        <div
          className="sm:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Left: count + hint */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink">
              {count > 0 ? (
                <>
                  <span className="font-semibold text-highlight">{count}</span>{' '}
                  {countLabel}
                </>
              ) : (
                <span className="text-ink-muted">All — no filter</span>
              )}
            </p>
            {hint && (
              <p className="text-xs text-ink-subtle mt-0.5 truncate">
                {hint}
              </p>
            )}
          </div>

          {/* Right (wide): inline buttons */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {actions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant ?? 'ghost'}
                onClick={action.onClick}
                disabled={action.disabled ?? false}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* Right (small): hamburger */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="More actions"
            aria-expanded={open}
            className="
              sm:hidden inline-flex items-center justify-center
              w-10 h-10 rounded-md border border-border
              bg-surface-2 text-ink
              hover:border-accent-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
            "
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom sheet — small screens only, when open */}
      {open && (
        <div
          className="sm:hidden fixed inset-x-0 bottom-0 z-40"
          role="dialog"
          aria-label="Actions"
        >
          <div className="rounded-t-2xl border-t border-x border-border bg-surface shadow-2xl p-4 pb-6 space-y-2">
            {sheetActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleAction(action)}
                disabled={action.disabled ?? false}
                className={[
                  'w-full h-12 rounded-md border text-sm font-medium',
                  'transition-colors text-center',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  VARIANT_CLASS[action.variant ?? 'ghost'] ?? VARIANT_CLASS.ghost,
                ].join(' ')}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}