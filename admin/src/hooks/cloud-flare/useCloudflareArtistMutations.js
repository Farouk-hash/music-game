import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function useCloudflareArtistMutations() {
  const queryClient = useQueryClient();

  // Invalidate every genre's artist list, since the artist may appear in multiple
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: ['cloudflare-artists'] });

  const pushMutation = useMutation({
    mutationFn: (artist) =>
      api.post('/cloudflare/artists', {
        id: artist.id,
        name: artist.name,
        genre_ids: artist.genre_ids ?? [],
        image: artist.image ?? null,
        tracks_count: artist.tracks_count ?? 0,
        is_customized: artist.is_customized ? 1 : 0,
      }),
    onSuccess: invalidateAll,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...body }) =>
      api.put(`/cloudflare/artists/${id}`, body),
    onSuccess: invalidateAll,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/artists/${id}`),
    onSuccess: invalidateAll,
  });

  return {
    push: (artist) => pushMutation.mutateAsync(artist),
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