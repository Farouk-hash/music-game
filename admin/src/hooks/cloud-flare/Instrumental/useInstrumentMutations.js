// admin/src/hooks/cloud-flare/useInstrumentMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export function useInstrumentMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['instruments'] });
  };

  const removeSegment = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/remote/instruments/${id}`),
    onSuccess: invalidate,
  });

  const removeTrack = useMutation({
    mutationFn: async (segmentIds) => {
      const results = [];
      for (const id of segmentIds) {
        results.push(await api.delete(`/cloudflare/remote/instruments/${id}`));
      }
      return results;
    },
    onSuccess: invalidate,
  });

  return { removeSegment, removeTrack };
}