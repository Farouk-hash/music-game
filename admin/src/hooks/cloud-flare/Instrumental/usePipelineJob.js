// admin/src/hooks/usePipelineJob.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

/**
 * Polls a pipeline job's status by ID. Stops on terminal state.
 *
 *   const { data: job, isLoading } = usePipelineJob(jobId);
 *
 * Works for any job scope (reverse-batch, instrumental-batch, …) —
 * they all live in the same job registry and are served by the same
 * GET /pipeline/jobs/:id endpoint.
 */
export function usePipelineJob(jobId) {
  return useQuery({
    queryKey: ['pipeline-job', jobId],
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