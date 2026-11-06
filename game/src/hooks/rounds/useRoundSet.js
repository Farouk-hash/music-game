// game/src/hooks/useRoundSet.js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export function useRoundSet({
  genres = [],
  artists = [],
  years = [],
  count = 3,
  instruments = 'none',
  enabled = true,
} = {}) {
  const payload = {
    genres,
    artists,
    years,
    count,
    instruments,
  };

  const queryKey = ['game-round-set', JSON.stringify(payload)];

  return useQuery({
    queryKey,
    queryFn: () => api.post('/round-set', payload), // Changed to POST
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: enabled && (genres.length > 0 || artists.length > 0),
  });
}