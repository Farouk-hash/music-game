// src/hooks/useCloudflareGenres.js
import { useApiQuery } from '../useApiQuery';

/**
 * Fetches the list of genres stored in Cloudflare D1.
 *
 *   const { genres, ids, byId, loading, error } = useCloudflareGenres();
 *
 * `ids`  — a Set of numeric IDs (for fast membership tests)
 * `byId` — a Map of id → genre object (for lookups)
 */
export function useCloudflareGenres() {
  const { data, error, isLoading } = useApiQuery(
    ['cloudflare-genres'],
    '/cloudflare/genres'
  );

  const genres = data?.genres ?? [];

  return {
    genres,
    count: data?.count ?? 0,
    ids: new Set(genres.map(g => g.id)),
    byId: new Map(genres.map(g => [g.id, g])),
    loading: isLoading,
    error,
  };
}