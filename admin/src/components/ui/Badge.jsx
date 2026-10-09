

const variants = {
  default: 'bg-surface-subtle text-ink-muted',
  brand:   'bg-brand-100 text-brand-700',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger:  'bg-danger-subtle text-danger',
  outline: 'bg-transparent text-ink-muted border border-surface-border',
};

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export function Badge({
  variant = 'default',
  size = 'sm',
  className = '',
  children,
  ...rest
}) {
  const base = 'inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap';
  const classes = [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}


// <Badge variant="brand">راب</Badge>
// <Badge variant="success">Verified</Badge>
// <Badge variant="outline">127 tracks</Badge>