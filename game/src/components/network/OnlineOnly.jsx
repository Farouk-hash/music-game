// game/src/components/network/OnlineOnly.jsx
import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';
import { OfflineBlock } from './OfflineBlock.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';

/**
 * Route guard for pages that need the network.
 *
 * - Entered while offline: children are NEVER mounted, so no hook or effect
 *   inside them can start an API call.
 * - Connection lost mid-game: children stay mounted (game state is kept) and a
 *   blocking overlay is shown until the connection is back.
 */
export function OnlineOnly({ children }) {
  const online = useNetworkStatus();
  const [started, setStarted] = useState(() => navigator.onLine);

  useEffect(() => {
    if (online) setStarted(true);
  }, [online]);

  // Stop any clip that is currently playing while the overlay is up.
  // (Covers <audio> elements in the DOM; see notes about `new Audio()`.)
  useEffect(() => {
    if (online) return;
    document.querySelectorAll('audio').forEach((a) => {
      try { a.pause(); } catch { /* ignore */ }
    });
  }, [online]);

  if (!started) {
    return <OfflineBlock onRetry={() => setStarted(navigator.onLine)} />;
  }

  return (
    <>
      {children}
      {!online && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-40 bg-bg/90 flex items-center justify-center p-6"
        >
          <BorderContainer border="all" className="p-8 text-center space-y-2">
            <div className="text-4xl">📡</div>
            <p className="text-ink font-medium text-lg">Connection lost</p>
            <p className="text-ink-muted text-sm">
              The game is paused and will continue when you are back online.
            </p>
          </BorderContainer>
        </div>
      )}
    </>
  );
}