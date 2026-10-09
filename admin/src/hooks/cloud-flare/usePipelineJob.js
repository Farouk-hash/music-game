// admin/src/hooks/cloud-flare/usePipelineJob.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

/**
 * Poll a single pipeline job every 2s while it's active.
 * Stops polling on:
 *   - terminal job status (done / failed / cancelled)
 *   - any error (404 = registry lost it after a server restart)
 *
 * Usage:
 *   const { data: job, error, isError } = usePipelineJob(jobId);
 */
export function usePipelineJob(jobId) {
  return useQuery({
    queryKey: ['pipeline', 'job', jobId],
    queryFn: () => api.get(`/pipeline/jobs/${jobId}`).then(r => r.job),
    enabled: !!jobId,

    // 404 means the job is gone. Don't retry, don't keep polling.
    retry: (failureCount, error) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },

    refetchInterval: (query) => {
      // Stop on ANY error — most commonly 404 after a server restart.
      if (query.state.status === 'error') return false;

      const job = query.state.data;
      if (!job) return 2000;
      if (job.status === 'done' ||
          job.status === 'failed' ||
          job.status === 'cancelled') {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: true,
  });
}