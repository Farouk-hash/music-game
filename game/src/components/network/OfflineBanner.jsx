// game/src/components/network/OfflineBanner.jsx
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-wrong text-bg text-center text-xs font-semibold py-1.5 px-4 sticky top-0 z-50 shadow-md"
    >
      ⚠️ You are offline. Playing and syncing are unavailable until you reconnect.
    </div>
  );
}