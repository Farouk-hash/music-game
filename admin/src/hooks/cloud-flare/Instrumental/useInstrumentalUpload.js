// admin/src/hooks/cloud-flare/Instrumental/useInstrumentalUpload.js
import { useCallback, useState } from 'react';
import { api } from '../../../lib/api';
import { usePipelineJob } from '../usePipelineJob';

/**
 * Fires POST /api/instrumental/upload and tracks the job.
 *
 *   const upload = useInstrumentalUpload();
 *   upload.start({ items: [...] });
 *   // upload.jobId, upload.job, upload.starting, upload.error, upload.count
 */
export function useInstrumentalUpload() {
  const [jobId, setJobId]       = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState(null);
  const [count, setCount]       = useState(null);

  const { data: job } = usePipelineJob(jobId);

  const start = useCallback(async ({ items }) => {
    setError(null);
    setStarting(true);
    setCount(null);
    try {
      const result = await api.post('/instrumental/upload', { items });
      if (result?.job?.id) {
        setJobId(result.job.id);
        setCount(result.count ?? 0);
      } else if (result?.count === 0) {
        setError(result.message ?? 'Nothing to upload.');
      }
    } catch (e) {
      setError(e.message ?? 'Upload failed.');
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