// src/hooks/cloud-flare/useTrackArtists.js
import { useMemo } from 'react';
import { useApiQuery } from '../useApiQuery';

/**
 * Fetch every artist that has at least one forward clip.
 * Used by the admin track list for:
 *   - the artist filter dropdown
 *   - mapping artistId → artistName in the current page
 *
 *   const { artists, byId, loading, error } = useTrackArtists();
 */
export function useTrackArtists() {
  const query = useApiQuery(
    ['track-artists'],
    '/cloudflare/tracks/artists-with-clips'
  );

  const artists = useMemo(
    () => query.data?.artists ?? [],
    [query.data]
  );

  const byId = useMemo(() => {
    const m = new Map();
    for (const a of artists) m.set(a.id, a);
    return m;
  }, [artists]);

  return {
    artists,
    byId,
    loading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
}