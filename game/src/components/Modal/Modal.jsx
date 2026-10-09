// game/src/components/Modal/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  children,
  closeOnBackdrop = true,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={`relative z-10 w-full ${SIZE_CLASS[size] ?? SIZE_CLASS.md}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}