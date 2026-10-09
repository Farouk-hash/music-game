// game/src/components/Modal/ModalContent.jsx
/**
 * The inner card of a modal. Accepts a title, a body, and footer actions.
 *
 *   <ModalContent
 *     title="Are you sure?"
 *     description="This action cannot be undone."
 *     footer={<><Button>Cancel</Button><Button>Confirm</Button></>}
 *   >
 *     {children}
 *   </ModalContent>
 */
export function ModalContent({
  title,
  description,
  children,
  footer,
  className = '',
}) {
  return (
    <div
      className={[
        'rounded-lg border border-border bg-surface shadow-lg',
        'p-6 space-y-4',
        className,
      ].join(' ')}
    >
      {title && (
        <h2 className="text-lg font-bold text-ink leading-tight">
          {title}
        </h2>
      )}

      {description && (
        <p className="text-sm text-ink-muted leading-relaxed">
          {description}
        </p>
      )}

      {children}

      {footer && (
        <div className="flex items-center justify-end gap-2 pt-2">
          {footer}
        </div>
      )}
    </div>
  );
}