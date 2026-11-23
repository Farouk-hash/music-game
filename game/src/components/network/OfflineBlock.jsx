import { Link } from 'react-router-dom';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';

const DEFAULT_MESSAGE =
  'You need an active connection to load rounds and sync your progress. ' +
  'You can still browse the catalog and adjust your settings.';

/**
 * Shown instead of content that needs the network.
 *
 * @param variant        'page' (default, centered card) | 'banner' (compact, inline)
 * @param title          heading text
 * @param subtitle       body text (alias: message)
 * @param onRetry        function → shows a retry button with this callback
 *                       undefined/null → NO retry button shown
 * @param showSetupLink  show the "Go to Setup" link (page variant only)
 * @param icon           custom icon node (defaults to 📡)
 */
export function OfflineBlock({
  variant = 'page',
  title = 'No Internet Connection',
  subtitle,
  message,
  onRetry,
  showSetupLink = true,
  icon,
}) {
  const text = subtitle ?? message ?? DEFAULT_MESSAGE;
  
  // ✅ Only enable retry if explicitly provided as a function
  const hasRetry = typeof onRetry === 'function';

  if (variant === 'banner') {
    return (
      <div role="status">
        <BorderContainer border="all" className="p-3 flex items-start gap-3 text-left">
          <span className="text-wrong shrink-0 mt-0.5">{icon ?? '📡'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-sm font-medium">{title}</p>
            <p className="text-ink-muted text-xs">{text}</p>
          </div>
          {/* ✅ Only render retry button when onRetry is a function */}
          {hasRetry && (
            <Button variant="secondary" onClick={onRetry}>Retry</Button>
          )}
        </BorderContainer>
      </div>
    );
  }

  return (
    <BorderContainer border="all" className="p-8 text-center space-y-4">
      {icon ? (
        <div className="flex justify-center">{icon}</div>
      ) : (
        <div className="text-4xl mb-2">📡</div>
      )}
      <p className="text-ink font-medium text-lg">{title}</p>
      <p className="text-ink-muted text-sm">{text}</p>
      
      {/* ✅ Only render actions container if at least one action exists */}
      {(showSetupLink || hasRetry) && (
        <div className="flex justify-center gap-3 pt-2">
          {showSetupLink && (
            <Link to="/setup">
              <Button variant="secondary">Go to Setup</Button>
            </Link>
          )}
          {/* ✅ Only render retry button when onRetry is a function */}
          {hasRetry && (
            <Button variant="primary" onClick={onRetry}>Try Again</Button>
          )}
        </div>
      )}
    </BorderContainer>
  );
}