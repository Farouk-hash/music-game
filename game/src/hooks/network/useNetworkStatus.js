// game/src/hooks/network/useNetworkStatus.js
import { useSyncExternalStore } from 'react';

// One shared subscription per component, no per-component useState/effect.
function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

/**
 * true  = the browser thinks it has a connection
 * false = definitely offline
 * (`true` does not prove the internet works; api.js also catches failed fetches.)
 */
export function useNetworkStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}