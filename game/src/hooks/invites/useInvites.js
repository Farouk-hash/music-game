// game/src/hooks/invites/useInvites.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteApi } from '../../lib/inviteApi.js';
import { useProfileContext } from '../../context/ProfileContext.jsx';

const PENDING_KEY = (me) => ['invites', 'pending', me];

export function usePendingInvites({ enabled = true } = {}) {
  const { id } = useProfileContext();
  return useQuery({
    queryKey: PENDING_KEY(id),
    queryFn: () => inviteApi.pending(id),
    enabled: enabled && !!id,
    staleTime: 10 * 1000,
    refetchInterval: 15000,          // poll every 15s while mounted
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });
}

export function useSendInvites() {
  const { id } = useProfileContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomCode, friendIds, revokedIds }) =>
      inviteApi.send(id, roomCode, friendIds, revokedIds),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['invites', 'pending', id] });
      qc.invalidateQueries({ queryKey: ['invites', 'room', id, variables.roomCode] });
    },
  });
}

export function useDismissInvite() {
  const { id } = useProfileContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId) => inviteApi.dismiss(id, inviteId),
    // Optimistic: remove the invite from the cached list immediately.
    onMutate: async (inviteId) => {
      await qc.cancelQueries({ queryKey: PENDING_KEY(id) });
      const prev = qc.getQueryData(PENDING_KEY(id));
      if (prev?.invites) {
        qc.setQueryData(PENDING_KEY(id), {
          ...prev,
          invites: prev.invites.filter((inv) => inv.id !== inviteId),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(PENDING_KEY(id), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['invites', 'pending', id] });
    },
  });
}


export function useRoomInvites(roomCode, { enabled = true } = {}) {
  const { id } = useProfileContext();
  return useQuery({
    queryKey: ['invites', 'room', id, roomCode],
    queryFn: () => inviteApi.roomInvites(id, roomCode),
    enabled: enabled && !!id && !!roomCode,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}