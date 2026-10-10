// admin/src/hooks/cloud-flare/useInstrumentalLocal.js
import { useCallback, useState } from 'react';

export function useInstrumentalLocal() {
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const scan = useCallback(async (artists) => {
    setScanning(true);
    setError(null);
    setItems([]);
    try {
      const ids = artists.map(a => a.id).join(',');
      const res = await fetch(`/api/instrumental/local?artist_ids=${ids}`);
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const data = await res.json();

      // Merge the artist's genre_ids (from the loaded artist list)
      // so the upload row gets [6, ...artist_genres].
      const genreById = new Map(
        artists.map(a => [a.id, Array.isArray(a.genre_ids) ? a.genre_ids : []])
      );
      const enriched = (data.items ?? []).map(it => ({
        ...it,
        genreIds: [6, ...(genreById.get(it.artistId) ?? [])],
      }));

      setItems(enriched);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setScanning(false);
    setItems([]);
    setError(null);
  }, []);

  return { scanning, items, error, scan, reset };
}