// game/src/hooks/ui/useToast.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Dismiss the toast.
   *
   *   reason = 'expire'  → timer ran out OR user acknowledged (✕ on toast)
   *                        → fire onDismiss
   *   reason = 'cancel'  → user pressed an action button (Undo)
   *                        → fire onAction only, NOT onDismiss
   *   reason = 'replace' → another toast is taking over
   *                        → fire neither
   */
  const dismiss = useCallback((reason = 'cancel') => {
    clearTimer();
    setToast((current) => {
      if (!current) return null;
      if (reason === 'expire') current.onDismiss?.();
      return null;
    });
  }, [clearTimer]);

  const show = useCallback((config) => {
    clearTimer();
    // Replace any existing toast silently — do not fire its onDismiss.
    const id = Date.now();
    const startedAt = performance.now();
    setToast({ id, startedAt, durationMs: 6000, ...config });

    const duration = config.durationMs ?? 6000;
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setToast((current) => {
          if (current?.id === id) current.onDismiss?.();
          return null;
        });
        timerRef.current = null;
      }, duration);
    }
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <ToastContext.Provider value={{ toast, show, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastHost() {
  const { toast, dismiss } = useToast();

  if (!toast) return null;

  function handleAction() {
    const action = toast.onAction;
    dismiss('cancel');
    action?.();
  }

  function handleClose() {
    dismiss('expire');
  }

  return (
    <div
      className="fixed top-4 inset-x-0 z-[70] flex justify-center pointer-events-none px-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex flex-col rounded-lg border border-border bg-surface shadow-lg max-w-md w-full overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm text-ink flex-1 min-w-0 truncate" dir="auto">
            {toast.message}
          </span>

          {toast.actionLabel && (
            <button
              type="button"
              onClick={handleAction}
              className="text-sm font-semibold text-accent hover:text-accent-2 transition-colors shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            aria-label="Dismiss"
            className="text-ink-subtle hover:text-ink transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        <ToastProgressBar startedAt={toast.startedAt} durationMs={toast.durationMs} />
      </div>
    </div>
  );
}

/**
 * Thin bar at the bottom of the toast. Drains from 100% → 0% over
 * `durationMs`, shifting green → gold → red as time runs out.
 *
 * Pauses when the tab is hidden? No — the timeout in the provider
 * doesn't pause either, so keeping the bar in sync is correct: both
 * finish at the same wall-clock moment.
 */
function ToastProgressBar({ startedAt, durationMs }) {
  const [progress, setProgress] = useState(1);   // 1 → 0
  const rafRef = useRef(null);

  useEffect(() => {
    if (!startedAt || !durationMs || durationMs <= 0) return;

    function tick() {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, 1 - elapsed / durationMs);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startedAt, durationMs]);

  // Color: green (p=1) → gold (p=0.5) → red (p=0).
  let bgClass = 'bg-correct';
  if (progress <= 0.33)      bgClass = 'bg-wrong';
  else if (progress <= 0.66) bgClass = 'bg-highlight';

  return (
    <div className="h-1 w-full bg-surface-2" aria-hidden="true">
      <div
        className={['h-full transition-colors duration-200', bgClass].join(' ')}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}