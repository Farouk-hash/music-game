// src/components/Modal/Modal.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * A portal-rendered modal dialog.
 *
 *   <Modal open={isOpen} onClose={() => setOpen(false)} title="Add Genre">
 *     ...content...
 *   </Modal>
 *
 * Props:
 *   open      — controls visibility
 *   onClose   — called on backdrop click, ESC, or the ✕ button
 *   title     — optional header text
 *   size      — 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *   children  — modal content
 *   footer    — optional footer content (e.g., action buttons)
 */
export function Modal({
  open = false,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  className = '',
}) {
  const dialogRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Focus the dialog when it opens
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`
          relative w-full ${sizes[size] ?? sizes.md}
          bg-surface-muted border border-surface-border rounded-xl
          shadow-card-hover
          max-h-[calc(100vh-2rem)] flex flex-col
          outline-none
          ${className}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-surface-border shrink-0">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="
                w-8 h-8 rounded-md flex items-center justify-center
                text-ink-muted hover:text-ink hover:bg-surface-subtle
                transition-colors
              "
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-surface-border shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}