// game/src/hooks/sporcle/useRoomProfiles.js
import { useQueries } from '@tanstack/react-query';
import { profileApi } from '@/lib/profileApi.js';

/**
 * Fetch profiles for a list of players, keyed by profileId.
 *
 * `profileApi.get(id)` returns `{ profile }` — we unwrap so callers
 * receive the profile directly.
 *
 * React Query dedupes + caches by `['profile', id]`, so this shares
 * cache entries with the local `useProfile` hook.
 *
 * Offline: queries that have never fetched stay paused (no request is made)
 * and resume by themselves when the connection returns.
 * `refetchOnReconnect` is off so a reconnect doesn't refetch every player's
 * profile at once; avatars/nicknames rarely change mid-game.
 */
export function useRoomProfiles(players = []) {
  const ids = Array.from(
    new Set(players.map((p) => p.profileId).filter(Boolean))
  );

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['profile', id],
      queryFn: () => profileApi.get(id),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      select: (data) => data?.profile ?? null,
    })),
  });

  const map = new Map();
  queries.forEach((q, i) => {
    if (q.data) map.set(ids[i], q.data);
  });
  return map;
}