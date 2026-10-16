// game/src/hooks/follows/useFollows.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followApi } from '../../lib/followApi.js';
import { useProfileContext } from '../../context/ProfileContext.jsx';

const FRIENDS_KEY = (me) => ['follows', 'friends', me];
const PENDING_KEY = (me) => ['follows', 'pending', me];
const STATUS_KEY = (me, target) => ['follows', 'status', me, target];

/* ── Reads ─────────────────────────────────────────────── */

export function useFriends() {
  const { id } = useProfileContext();
  return useQuery({
    queryKey: FRIENDS_KEY(id),
    queryFn: () => followApi.friends(id),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePending() {
  const { id } = useProfileContext();
  return useQuery({
    queryKey: PENDING_KEY(id),
    queryFn: () => followApi.pending(id),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Relationship between me and a specific profile.
 *
 * Returns the status string ('none' | 'requested' | 'incoming' | 'friends' | 'following' | 'self')
 * or 'loading' while fetching.
 */
export function useFollowStatus(targetId) {
  const { id } = useProfileContext();
  const q = useQuery({
    queryKey: STATUS_KEY(id, targetId),
    queryFn: () => followApi.status(id, targetId),
    enabled: !!id && !!targetId && id !== targetId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
  if (!id || !targetId) return { status: 'self', isLoading: false };
  if (id === targetId)     return { status: 'self', isLoading: false };
  return {
    status: q.data?.status ?? 'loading',
    isLoading: q.isLoading,
  };
}

/* ── Writes ────────────────────────────────────────────── */

function useInvalidateAll() {
  const qc = useQueryClient();
  const { id } = useProfileContext();
  return () => {
    qc.invalidateQueries({ queryKey: ['follows', 'friends', id] });
    qc.invalidateQueries({ queryKey: ['follows', 'pending', id] });
    qc.invalidateQueries({ queryKey: ['follows', 'status', id] });
  };
}

export function useSendRequest() {
  const { id } = useProfileContext();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (followeeId) => followApi.sendRequest(id, followeeId),
    onSettled: invalidate,
  });
}

export function useAcceptRequest() {
  const { id } = useProfileContext();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (followerId) => followApi.accept(id, followerId),
    onSettled: invalidate,
  });
}

export function useDeclineRequest() {
  const { id } = useProfileContext();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (followerId) => followApi.decline(id, followerId),
    onSettled: invalidate,
  });
}

export function useUnfollow() {
  const { id } = useProfileContext();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (otherId) => followApi.unfollow(id, otherId),
    onSettled: invalidate,
  });
}