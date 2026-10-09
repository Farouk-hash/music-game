import { Link } from 'react-router-dom';

/**
 * A small back navigation link with an arrow icon.
 * In RTL, the arrow points right.
 */
export function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand-500 transition-colors"
    >
      <span aria-hidden="true" className="text-lg leading-none">→</span>
      <span>{children}</span>
    </Link>
  );
}