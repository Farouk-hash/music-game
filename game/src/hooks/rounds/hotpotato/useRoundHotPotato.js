// game/src/hooks/rounds/useRoundHotPotato.js
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.js';

export function useRoundHotPotato({
  genres = [],
  artists = [],
  years = [],
  types = [],
  players = [],
  level = 1,
  count = 5,
  rendition = 'forward',
  instruments = 'none',
  enabled = true,
} = {}) {
  const playerCount = players.length;
  const ok = enabled && playerCount >= 2 && playerCount <= 5;

  // One id per game screen. It makes the cache key unique, so starting another
  // game with the same settings never reuses the previous game's questions.
  const [gameKey] = useState(() => Math.random().toString(36).slice(2));

  const payload = {
    genres,
    artists,
    years,
    types,
    players: playerCount,
    level,
    count,
    rendition,
    instruments,
    mode: 'hotpotato', // the server builds ONE shared list for all players
  };

  return useQuery({
    queryKey: ['game-round-hotpotato', gameKey, JSON.stringify(payload)],
    queryFn: () => api.post('/round-multiplayer', payload),
    // The questions of a running game must never change underneath the session.
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: ok,
  });
}