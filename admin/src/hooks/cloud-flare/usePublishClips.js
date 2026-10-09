import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

/**
 * Publish one or more clips to Cloudflare.
 *
 *   const publish = usePublishClips();
 *   publish.mutate({ clips: [...] });
 *   publish.isPending
 *   publish.data      // { ok, total, succeeded, failed, elapsed, results }
 *   publish.error
 */
export function usePublishClips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clips }) =>
      api.post('/cloudflare/tracks/publish-clips', { clips }),
    onSuccess: () => {
      // Refresh everything that could be affected
      queryClient.invalidateQueries({ queryKey: ['cloudflare-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['cloudflare-artists'] });
    },
  });
}