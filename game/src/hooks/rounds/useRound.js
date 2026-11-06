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
  // Build the JSON payload
  const payload = {
    genres,
    artists,
    years,
    types,
    count,
    rendition,
    instruments,
  };

  // Stringify for the query key so it updates when params change
  const queryKey = ['game-round', JSON.stringify(payload)];

  return useQuery({
    queryKey,
    queryFn: () => api.post('/round', payload), // Changed to POST
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled,
  });
}