// game/src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global default — extended to keep user session snappy
      staleTime: 10 * 60 * 1000,        // 10 min (was 5 min)
      gcTime: 60 * 60 * 1000,          // 60 min (was 30 min)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'game-query-cache',
  throttleTime: 1000,
});

export const PERSIST_WHITELIST = new Set([
  'game-catalog',
  'game-templates',
]);

export const persistOptions = {
  persister,
  maxAge: ONE_WEEK,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey?.[0];
      return PERSIST_WHITELIST.has(key);
    },
  },
};