// game/src/hooks/useCatalog.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

/**
 * Fetches the game catalog: genres, artists, years, and aggregate counts.
 * Long staleTime — the catalog changes only when the admin publishes.
 *
 *   const { data, isLoading, error } = useCatalog();
 *   // data: { genres, artists, years, counts, version }
 *
 * years shape: [{ year: 1998, artist_ids: [1, 5, 9] }, ...]
 */
export function useCatalog() {
  return useQuery({
    queryKey: ['game-catalog'],
    queryFn: () => api.get('/catalog'),
    staleTime: 5 * 60 * 1000,
  });
}