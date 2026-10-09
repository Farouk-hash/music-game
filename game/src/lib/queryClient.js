import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes; after that, refetch on next mount
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Don't refetch on window focus by default (admin panel behavior)
      refetchOnWindowFocus: false,
      // Retry failed queries twice with exponential backoff
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});


// import { QueryClient } from '@tanstack/react-query';

// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       // 0 = always considered stale → refetch on every mount/focus/navigation
//       staleTime: 0,
//       // Keep in cache briefly for dedup, but nothing fancier
//       gcTime: 5 * 60 * 1000,
//       // Refetch whenever the tab/window is focused
//       refetchOnWindowFocus: true,
//       // Refetch when the component mounts, even if there's cached data
//       refetchOnMount: 'always',
//       // Refetch when the network reconnects
//       refetchOnReconnect: true,
//       retry: 2,
//       retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
//     },
//   },
// });