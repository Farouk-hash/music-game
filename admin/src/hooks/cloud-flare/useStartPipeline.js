// admin/src/hooks/cloud-flare/useStartPipeline.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

/**
 * Start and cancel pipeline jobs. Invalidates the jobs list on
 * success so a history panel refreshes.
 */
export function useStartPipeline() {
  const qc = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (payload) =>
      api.post('/pipeline/jobs', payload).then(r => r.job),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline', 'jobs'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId) =>
      api.post(`/pipeline/jobs/${jobId}/cancel`, {}).then(r => r.job),
    onSuccess: (job) => {
      qc.setQueryData(['pipeline', 'job', job.id], job);
      qc.invalidateQueries({ queryKey: ['pipeline', 'jobs'] });
    },
  });

  return {
    start:       startMutation.mutateAsync,
    cancel:      cancelMutation.mutate,
    cancelAsync: cancelMutation.mutateAsync,

    isStarting:  startMutation.isPending,
    isCancelling: cancelMutation.isPending,

    startError:  startMutation.error,
    cancelError: cancelMutation.error,

    resetStart:  startMutation.reset,
  };
}