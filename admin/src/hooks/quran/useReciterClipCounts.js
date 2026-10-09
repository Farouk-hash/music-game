// src/hooks/quran/useReciterClipCounts.js
import { useMemo } from 'react';
import { useApiQuery } from '../useApiQuery';

/**
 * Count published clips per surah-name for a given reciter.
 *
 *   const clipCounts = useReciterClipCounts({ reciterId: 92 });
 *   // Map { 'البقرة — حفص عن عاصم - مرتل' => 3, ... }
 *
 * Returns a Map keyed by the stored clip name (which is the surah's
 * displayName — "surah — moshaf"). Surahs with zero clips are absent;
 * use `map.get(name) ?? 0`.
 */
export function useReciterClipCounts({ reciterId }) {
  const path = reciterId
    ? `/cloudflare/tracks?artist_id=${reciterId}`
    : null;

  const { data, isLoading, error } = useApiQuery(
    ['cloudflare-tracks', 'by-reciter', reciterId],
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