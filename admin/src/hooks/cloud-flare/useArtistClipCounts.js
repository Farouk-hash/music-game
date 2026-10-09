// src/hooks/cloud-flare/useArtistClipCounts.js
import { useMemo } from 'react';
import { useApiQuery } from '../useApiQuery';

/**
 * Count clips per track name for a given artist.
 *
 *   const clipCounts = useArtistClipCounts({ artistId: 84 });
 *   // Map { 'اغنية اثبت مكانك' => 3, 'ممكن كده' => 1, ... }
 *
 * Returns a Map keyed by track name. Tracks with zero clips are absent
 * from the map — callers should use `map.get(name) ?? 0`.
 */
export function useArtistClipCounts({ artistId }) {
  const path = artistId
    ? `/cloudflare/tracks?artist_id=${artistId}`
    : null;

  const { data, isLoading, error } = useApiQuery(
    ['cloudflare-tracks', 'by-artist', artistId],
    path
  );

  const clipCounts = useMemo(() => {
    const map = new Map();
    const tracks = data?.tracks ?? [];
    for (const clip of tracks) {
      map.set(clip.name, (map.get(clip.name) ?? 0) + 1);
    }
    return map;
  }, [data]);

  return {
    clipCounts,
    loading: isLoading,
    error,
  };
}