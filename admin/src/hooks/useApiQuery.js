// src/hooks/useApiQuery.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Base hook wrapping TanStack's useQuery with our API client.
 *
 *   const { data, isLoading, error } = useApiQuery(['genres'], '/genres');
 *
 * The first argument is a query key (array). Same key = same cache entry.
 * The second is the API path.
 */
export function useApiQuery(queryKey, path, options = {}) {
  return useQuery({
    queryKey,
    queryFn: () => api.get(path),
    enabled: Boolean(path),   // don't fire when path is null/undefined
    ...options,
  });
}