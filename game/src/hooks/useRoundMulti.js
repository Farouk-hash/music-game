// game/src/hooks/useRoundMulti.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Fetches multi-question rounds from the Worker.
 *
 * `years` composes with artists or genres, whichever wins the
 * artist/genre exclusivity check.
 */
export function useRoundMulti({
  genres = [],
  artists = [],
  years = [],
  types = [],
  count = 5,
  rendition = 'forward',
  enabled = true,
} = {}) {
  const params = new URLSearchParams();
  if (artists.length > 0)      params.set('artists', artists.join(','));
  else if (genres.length > 0)  params.set('genres', genres.join(','));
  if (years.length > 0)        params.set('years', years.join(','));
  if (types.length > 0)        params.set('types', types.join(','));
  if (rendition === 'reverse') params.set('rendition', 'reverse');

  params.set('count', String(count));

  const qs = params.toString();

  return useQuery({
    queryKey: ['game-round-multi', qs],
    queryFn: () => api.get(`/round-multi?${qs}`),
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled,
  });
}