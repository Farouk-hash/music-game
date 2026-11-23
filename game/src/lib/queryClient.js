// game/src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { isNetworkError } from '@/lib/api.js';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      // Must be >= persistOptions.maxAge, otherwise persisted queries are
      // garbage-collected in memory and removed from storage too.
      gcTime: ONE_WEEK,
      refetchOnWindowFocus: false,
      // Refetch on mount only when stale. Offline, a stale query stays PAUSED
      // (default networkMode 'online') and keeps showing its cached data.
      refetchOnMount: true,
      refetchOnReconnect: true,
      // Never retry when the network itself is the problem.
      retry: (failureCount, error) => !isNetworkError(error) && failureCount < 1,
    },
    mutations: {
      // Default 'online' PAUSES a mutation while offline: mutateAsync() then never
      // settles, and the action silently runs later when the connection returns.
      // 'always' runs it now; api.js throws an offline error immediately and the
      // caller can show a message (or retry) instead of hanging.
      networkMode: 'always',
      retry: false,
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'game-query-cache',
  throttleTime: 1000,
});

// Only these query keys (first element) are written to localStorage.
// Rounds are intentionally NOT persisted.
export const PERSIST_WHITELIST = new Set([
  'game-catalog',
  'game-templates',
]);

export const persistOptions = {
  persister,
  maxAge: ONE_WEEK,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' &&
      PERSIST_WHITELIST.has(query.queryKey?.[0]),
  },
};