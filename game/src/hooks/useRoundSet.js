// game/src/hooks/useRoundSet.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Fetches sets for level 3. Each set contains 1–4 clips (played
 * simultaneously) and 2–4 questions.
 *
 *   const { data, isLoading, error } = useRoundSet({
 *     genres, artists, years, count
 *   });
 *   // data: { sets: [...], meta: {...} }
 *
 * Level 3 requires genres. `years` (if present) restricts the
 * genre's artist pool to those with matching-year clips.
 */
export function useRoundSet({
  genres = [],
  artists = [],
  years = [],
  count = 3,
  enabled = true,
} = {}) {
  const params = new URLSearchParams();
  if (genres.length > 0)  params.set('genres', genres.join(','));
  if (artists.length > 0) params.set('artists', artists.join(','));
  if (years.length > 0)   params.set('years', years.join(','));
  params.set('count', String(count));

  const qs = params.toString();

  return useQuery({
    queryKey: ['game-round-set', qs],
    queryFn: () => api.get(`/round-set?${qs}`),
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: enabled && (genres.length > 0 || artists.length > 0),
  });
}