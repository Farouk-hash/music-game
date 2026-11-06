// game/src/hooks/useRoundMulti.js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export function useRoundMulti({
  genres = [],
  artists = [],
  years = [],
  types = [],
  count = 5,
  rendition = 'forward',
  instruments = 'none',
  enabled = true,
} = {}) {
  const payload = {
    genres,
    artists,
    years,
    types,
    count,
    rendition,
    instruments,
  };

  const queryKey = ['game-round-multi', JSON.stringify(payload)];

  return useQuery({
    queryKey,
    queryFn: () => api.post('/round-multi', payload), // Changed to POST
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled,
  });
}