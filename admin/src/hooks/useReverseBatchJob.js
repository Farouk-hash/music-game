// admin/src/hooks/useReverseBatchJob.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Polls the reverse-batch job status. Stops on terminal state.
 *
 *   const { data: job, isLoading } = useReverseBatchJob(jobId);
 */
export function useReverseBatchJob(jobId) {
  return useQuery({
    queryKey: ['reverse-batch-job', jobId],
    queryFn: () => api.get(`/pipeline/jobs/${jobId}`).then(r => r.job),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return 2000;
      if (job.status === 'running' || job.status === 'starting') return 2000;
      return false;
    },
    retry: (failureCount, err) => {
      // Stop retrying on 404 — the registry lost the job (server restart)
      if (err?.status === 404) return false;
      return failureCount < 3;
    },
  });
}