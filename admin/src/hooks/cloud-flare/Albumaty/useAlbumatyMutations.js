// admin/src/hooks/cloud-flare/useAlbumatyMutations.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api.js';

export function useStartAlbumatyPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (artists) => api.post('/albumaty/publish-jobs', { artists }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['albumaty', 'jobs'] });
    },
  });
}

export function useAlbumatyPublishJob(jobId) {
  return useQuery({
    queryKey: ['albumaty', 'job', jobId],
    queryFn:  () => api.get(`/albumaty/publish-jobs/${jobId}`).then(r => r.job),
    enabled:  !!jobId,
    retry: false,                       // don't retry failed requests
    refetchInterval: (query) => {
      // Stop on error (404, network failure, etc.)
      if (query.state.error) return false;

      const job = query.state.data;
      if (!job) return 2000;

      if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: true,
  });
}

export function useCancelAlbumatyPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId) => api.post(`/albumaty/publish-jobs/${jobId}/cancel`, {}),
    onSuccess: (_, jobId) => {
      qc.invalidateQueries({ queryKey: ['albumaty', 'job', jobId] });
    },
  });
}