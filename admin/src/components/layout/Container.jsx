
const sizes = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

export function Container({ size = 'lg', className = '', children, ...rest }) {
  const classes = ['mx-auto w-full px-4 sm:px-6', sizes[size], className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}