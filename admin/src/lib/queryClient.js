// src/lib/queryClient.js
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