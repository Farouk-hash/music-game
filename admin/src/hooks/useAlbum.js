import { useApiQuery } from './useApiQuery';

/**
 * Fetch a single album with its tracklist.
 *
 *   const { album, tracks, loading, error } = useAlbum('994');
 */
export function useAlbum(id, { perPage = 100 } = {}) {
  const path = id
    ? `/albums/${encodeURIComponent(id)}?perPage=${perPage}`
    : null;

  const { data, error, isLoading } = useApiQuery(
    ['album', id, perPage],
    path
  );

  return {
    album:  data?.album ?? null,
    tracks: data?.tracks ?? [],
    loading: isLoading,
    error,
  };
}