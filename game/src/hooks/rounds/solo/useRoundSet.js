// game/src/hooks/useRoundSet.js
// LEVEL 3 MODE
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
    queryFn: () => api.post('/round-set', payload),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // ✅ Explicitly disable to prevent mid-game resets
    enabled: enabled && (genres.length > 0 || artists.length > 0),
  });
}