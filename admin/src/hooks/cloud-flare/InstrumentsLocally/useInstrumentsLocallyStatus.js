// admin/src/hooks/cloud-flare/InstrumentsLocally/useInstrumentsLocallyStatus.js
import { useCallback, useState } from 'react';

/**
 * Reads every local split-output track for the given artists.
 * Each returned track has `state: 'ready' | 'stale'`.
 * Tracks NOT present in the response are implicitly 'new'.
 */
export function useInstrumentsLocallyStatus() {
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks]   = useState([]);
  const [error, setError]     = useState(null);

  const load = useCallback(async (artists) => {
    setLoading(true);
    setError(null);
    setTracks([]);
    try {
      const ids = artists.map(a => a.id).join(',');
      const res = await fetch(`/api/instruments-locally/status?artist_ids=${ids}`);
      if (!res.ok) throw new Error(`Status load failed (${res.status})`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
      return data.tracks ?? [];
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setTracks([]);
    setError(null);
  }, []);

  return { loading, tracks, error, load, reset };
}