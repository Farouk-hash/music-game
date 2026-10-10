// game/src/hooks/useRoundMultiplayer.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Fetches multiplayer rounds from the Worker.
 *
 *   const { data, isLoading, error } = useRoundMultiplayer({
 *     genres, artists, years, types,
 *     players,          // string[]
 *     level,            // 1 | 2 | 3
 *     roundsPerPlayer,  // integer
 *     rendition,        // 'forward' | 'reverse'
 *     instruments,      // 'none' | 'mixed' | 'all'
 *   });
 */
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

  const params = new URLSearchParams();
  if (artists.length > 0)      params.set('artists', artists.join(','));
  else if (genres.length > 0)  params.set('genres', genres.join(','));
  if (years.length > 0)        params.set('years', years.join(','));
  if (types.length > 0)        params.set('types', types.join(','));
  if (rendition === 'reverse') params.set('rendition', 'reverse');
  if (instruments && instruments !== 'none') {
    params.set('instruments', instruments);
  }
  params.set('players', String(playerCount));
  params.set('level', String(level));
  params.set('count', String(roundsPerPlayer));

  const qs = params.toString();

  return useQuery({
    queryKey: ['game-round-multiplayer', qs],
    queryFn: () => api.get(`/round-multiplayer?${qs}`),
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: ok,
  });
}