// game/src/hooks/useRound.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Fetches a batch of rounds from the Worker.
 *
 * `types` is an array of question type strings. Empty array = all types.
 * `years` is an array of integers. Empty array = no year filter.
 * `instruments` is 'none' | 'mixed' | 'all' — default 'none'.
 *
 * Note: artists and genres are mutually exclusive in the query string
 * (artists replace genres when both are set). `years` composes with
 * whichever won.
 */
export function useRound({
  genres = [],
  artists = [],
  years = [],
  types = [],
  count = 5,
  rendition = 'forward',
  instruments = 'none',
  enabled = true,
} = {}) {
  const params = new URLSearchParams();
  if (artists.length > 0)      params.set('artists', artists.join(','));
  else if (genres.length > 0)  params.set('genres', genres.join(','));
  if (years.length > 0)        params.set('years', years.join(','));
  if (types.length > 0)        params.set('types', types.join(','));
  if (rendition === 'reverse') params.set('rendition', 'reverse');
  if (instruments && instruments !== 'none') {
    params.set('instruments', instruments);
  }
  params.set('count', String(count));

  const qs = params.toString();

  return useQuery({
    queryKey: ['game-round', qs],
    queryFn: () => api.get(`/round?${qs}`),
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled,
  });
}