// game/src/hooks/useRoundSet.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Fetches sets for level 3. Each set contains 1–4 clips and 2–4 questions.
 *
 * Level 3 requires genres. `years` (if present) restricts the genre's
 * artist pool to those with matching-year clips.
 *
 * Note: `instruments` is currently ignored by the Worker on /round-set —
 * we pass it through anyway for forward compatibility. The Level 3 modal
 * also disables the Instruments picker client-side.
 */
export function useRoundSet({
  genres = [],
  artists = [],
  years = [],
  count = 3,
  instruments = 'none',
  enabled = true,
} = {}) {
  const params = new URLSearchParams();
  if (genres.length > 0)  params.set('genres', genres.join(','));
  if (artists.length > 0) params.set('artists', artists.join(','));
  if (years.length > 0)   params.set('years', years.join(','));
  if (instruments && instruments !== 'none') {
    params.set('instruments', instruments);
  }
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