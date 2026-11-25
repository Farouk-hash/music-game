// game/src/hooks/useRound.js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

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
  const payload = {
    genres, artists, years, types, count, rendition, instruments,
  };

  const queryKey = ['game-round', JSON.stringify(payload)];

  return useQuery({
    queryKey,
    queryFn: () => api.post('/round', payload),
    staleTime: 0, // <--- Allow refetching for Play Again
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled,
  });
}