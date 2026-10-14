// game/src/hooks/sporcle/useRoomProfiles.js
import { useQueries } from '@tanstack/react-query';
import { profileApi } from '../../lib/profileApi.js';

/**
 * Fetch profiles for a list of players, keyed by profileId.
 *
 * `profileApi.get(id)` returns `{ profile }` — we unwrap so callers
 * receive the profile directly.
 *
 * React Query dedupes + caches by `['profile', id]`, so this shares
 * cache entries with the local `useProfile` hook.
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
      select: (data) => data?.profile ?? null,
    })),
  });

  const map = new Map();
  queries.forEach((q, i) => {
    if (q.data) map.set(ids[i], q.data);
  });
  return map;
}