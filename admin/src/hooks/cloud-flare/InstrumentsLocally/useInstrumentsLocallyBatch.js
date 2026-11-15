// admin/src/hooks/cloud-flare/InstrumentsLocally/useInstrumentsLocallyBatch.js
import { useCallback, useState } from 'react';
import { api } from '../../../lib/api';
import { usePipelineJob } from '../usePipelineJob';

/**
 * Fires POST /api/instruments-locally/batch and tracks the job.
 *
 *   const batch = useInstrumentsLocallyBatch();
 *   batch.start({ tracks: [...] });
 *   // batch.jobId, batch.job, batch.starting, batch.error, batch.count
 */
export function useInstrumentsLocallyBatch() {
  const [jobId, setJobId]       = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState(null);
  const [count, setCount]       = useState(null);

  const { data: job } = usePipelineJob(jobId);

  const start = useCallback(async (payload) => {
    setError(null);
    setStarting(true);
    setCount(null);
    try {
      const result = await api.post('/instruments-locally/batch', {
        segmentLengthSec: 30,
        bitrate: '192k',
        skipExisting: true,
        maxDemucsSec: 600,
        ...payload,
      });
      if (result?.job?.id) {
        setJobId(result.job.id);
        setCount(result.count ?? 0);
      } else if (result?.count === 0) {
        setError(result.message ?? 'No tracks found.');
      }
    } catch (e) {
      setError(e.message ?? 'Failed to start split job.');
    } finally {
      setStarting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setJobId(null);
    setStarting(false);
    setError(null);
    setCount(null);
  }, []);

  return { jobId, job, starting, error, count, start, reset };
}