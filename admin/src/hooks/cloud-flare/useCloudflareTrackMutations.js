// src/hooks/cloud-flare/useCloudflareTrackMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function useCloudflareTrackMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cloudflare-tracks'] });

  // ── Edit slot metadata + both r2 keys ────────────────
  const editMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/cloudflare/tracks/${id}`, body),
    onSuccess: invalidate,
  });

  // ── Remove the whole slot (forward + reversed) ───────
  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/tracks/${id}`),
    onSuccess: invalidate,
  });

  // ── Remove only the forward rendition ────────────────
  const removeForwardMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/tracks/${id}/forward`),
    onSuccess: invalidate,
  });

  // ── Remove only the reversed rendition ───────────────
  const removeReversedMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/tracks/${id}/reversed`),
    onSuccess: invalidate,
  });


  const reverseMutation = useMutation({
    mutationFn: ({ id, replace = false }) =>
      api.post(`/cloudflare/tracks/${id}/reverse`, { replace }),
    onSuccess: invalidate,
  });

  const startReverseBatch = useMutation({
    mutationFn: ({ limit } = {}) =>
      api.post('/cloudflare/tracks/reverse-batch', limit ? { limit } : {}),
  });

  return {
    // actions
    edit: (id, body) => editMutation.mutateAsync({ id, ...body }),
    remove: (id) => removeMutation.mutateAsync(id),
    removeForward: (id) => removeForwardMutation.mutateAsync(id),
    removeReversed: (id) => removeReversedMutation.mutateAsync(id),

    // edit state
    isEditing: editMutation.isPending,
    editingId: editMutation.variables?.id ?? null,
    editError: editMutation.error,

    // remove-slot state
    isRemoving: removeMutation.isPending,
    removingId: removeMutation.variables ?? null,
    removeError: removeMutation.error,

    // remove-forward state
    isRemovingForward: removeForwardMutation.isPending,
    removingForwardId: removeForwardMutation.variables ?? null,
    removeForwardError: removeForwardMutation.error,

    // remove-reversed state
    isRemovingReversed: removeReversedMutation.isPending,
    removingReversedId: removeReversedMutation.variables ?? null,
    removeReversedError: removeReversedMutation.error,


    reverse: ({ id, replace }) => reverseMutation.mutateAsync({ id, replace }),

    isReversing: reverseMutation.isPending,
    reversingId: reverseMutation.variables?.id ?? null,
    reverseError: reverseMutation.error,

    // reverse-batch
    startReverseBatchAsync: startReverseBatch.mutateAsync,


       startReverseBatch: startReverseBatch.mutateAsync,
  isStartingReverseBatch: startReverseBatch.isPending,
    reverseBatchError: startReverseBatch.error,
  };
}