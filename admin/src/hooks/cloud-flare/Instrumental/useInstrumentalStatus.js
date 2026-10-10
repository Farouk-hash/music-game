// admin/src/hooks/cloud-flare/Instrumental/useInstrumentalStatus.js
import { useCallback, useState } from 'react';

/**
 * Reads every locally-generated track for the given artists, with a flag
 * indicating whether it's already uploaded (only meta.json remains) or
 * still has MP3s on disk (ready to upload).
 */
export function useInstrumentalStatus() {
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async (artists) => {
    setLoading(true);
    setError(null);
    setTracks([]);
    try {
      const ids = artists.map(a => a.id).join(',');
      const res = await fetch(`/api/instrumental/status?artist_ids=${ids}`);
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