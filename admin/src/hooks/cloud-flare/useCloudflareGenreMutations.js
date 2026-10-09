// src/hooks/useCloudflareGenreMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function useCloudflareGenreMutations() {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cloudflare-genres'] });

  const pushMutation = useMutation({
    mutationFn: (genre) =>
      api.post('/cloudflare/genres', {
        id: genre.id,
        name: genre.name,
        display_name: genre.display_name,
        image: genre.image ?? null,
        is_customized: genre.is_customized ? 1 : 0,
      }),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...body }) =>
      api.put(`/cloudflare/genres/${id}`, body),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/genres/${id}`),
    onSuccess: invalidate,
  });

  return {
    push: (genre) => pushMutation.mutateAsync(genre),
    edit: (id, body) => editMutation.mutateAsync({ id, ...body }),
    remove: (id) => removeMutation.mutateAsync(id),

    isPushing: pushMutation.isPending,
    isEditing: editMutation.isPending,
    isRemoving: removeMutation.isPending,

    pushingId: pushMutation.variables?.id ?? null,
    editingId: editMutation.variables?.id ?? null,
    removingId: removeMutation.variables ?? null,
  };
}