import { forwardRef } from 'react';

const variants = {
  // On dark theme: brand hover is LIGHTER, not darker
  primary:
    'bg-brand-500 text-surface-DEFAULT hover:bg-brand-600 active:bg-brand-700 shadow-sm font-semibold',
  // Secondary: raised surface with border
  secondary:
    'bg-surface-subtle text-ink border border-surface-border hover:bg-surface-muted',
  // Ghost: transparent until hovered
  ghost:
    'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-subtle',
  // Danger: solid red-tinted
  danger:
    'bg-danger text-surface-DEFAULT hover:opacity-90 shadow-sm font-semibold',
};

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
};

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    children,
    ...rest
  },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium ' +
    'transition-colors select-none ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const classes = [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      ref={ref}
      className={classes}
      disabled={Component === 'button' ? disabled || loading : undefined}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </Component>
  );
});

{/* <Button>Save</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="danger" loading>Deleting…</Button>
<Button as="a" href="/genres">Back to genres</Button> */}