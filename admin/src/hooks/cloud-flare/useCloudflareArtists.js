// src/hooks/useCloudflareArtists.js
import { useApiQuery } from '../useApiQuery';

/**
 * Fetches the published artists stored in Cloudflare D1.
 *
 *   const { artists, ids, byId, loading, error } = useCloudflareArtists();
 *   const { artists } = useCloudflareArtists({ genreId: 5 });
 *   const { artists } = useCloudflareArtists({ source: 'albumaty' });
 *
 * `ids`  — Set<number>  (fast membership check for the source section)
 * `byId` — Map<number, artist>  (lookups, e.g. for editing)
 *
 * The query is cached per (genreId, source, limit), so paginating the
 * source list doesn't trigger a refetch.
 */
export function useCloudflareArtists({ genreId, source, limit = 500 } = {}) {
  const params = new URLSearchParams();
  if (genreId) params.set('genre_id', genreId);
  if (source && source !== 'all') params.set('source', source);
  params.set('limit', String(limit));

  const qs = `?${params.toString()}`;
  const key = ['cloudflare-artists', genreId ?? null, source ?? 'all', limit];

  const { data, error, isLoading } = useApiQuery(
    key,
    '/cloudflare/artists' + qs
  );

  const artists = data?.artists ?? [];

  return {
    artists,
    count: data?.total ?? data?.count ?? artists.length,
    ids: new Set(artists.map(a => a.id)),
    byId: new Map(artists.map(a => [a.id, a])),
    loading: isLoading,
    error,
  };
}