// game/src/components/game/SelectionBar.jsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button.jsx';
import { IconBurger } from '@/icons/index.js';

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

export function SelectionBar({
  count,
  countLabel = 'selected',
  hint,
  actions = [],
}) {
  const [open, setOpen] = useState(false);

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

  const sheetActions = [...actions].reverse();

  return (
    <>
      {open && (
        <div
          className="sm:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
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
            <IconBurger className="w-5 h-5" />
          </button>
        </div>
      </div>

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