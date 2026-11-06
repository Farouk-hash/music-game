// game/src/hooks/useRoundMultiplayer.js
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export function useRoundMultiplayer({
  genres = [],
  artists = [],
  years = [],
  types = [],
  players = [],
  level = 1,
  roundsPerPlayer = 5,
  rendition = 'forward',
  instruments = 'none',
  enabled = true,
} = {}) {
  const playerCount = players.length;
  const ok = enabled && playerCount >= 2 && playerCount <= 5;

  const payload = {
    genres,
    artists,
    years,
    types,
    players: playerCount,
    level,
    count: roundsPerPlayer,
    rendition,
    instruments,
  };

  const queryKey = ['game-round-multiplayer', JSON.stringify(payload)];

  return useQuery({
    queryKey,
    queryFn: () => api.post('/round-multiplayer', payload), // Changed to POST
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: ok,
  });
}