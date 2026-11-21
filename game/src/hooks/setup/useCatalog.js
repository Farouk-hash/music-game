// game/src/hooks/useCatalog.js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Fetches the game catalog: genres, artists, years, aggregate counts.
 * Cached for 7 days on the client AND persisted to localStorage.
 * Only refetches when the catalog version is bumped by the admin.
 */
export function useCatalog() {
  const catalogVersion = localStorage.getItem('game.catalogVersion') || 'v1';

  return useQuery({
    queryKey: ['game-catalog', catalogVersion],
    queryFn: () => api.get('/catalog'),
    staleTime: ONE_WEEK,
    gcTime: ONE_WEEK,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}