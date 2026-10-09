// game/src/components/ui/Button.jsx
const VARIANTS = {
  primary:
    'bg-accent text-bg hover:bg-accent-2 active:bg-accent-2 shadow-sm',
  secondary:
    'bg-surface-2 text-ink hover:bg-surface border border-border',
  ghost:
    'bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-wrong text-ink hover:opacity-90',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm rounded-sm',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-colors duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}