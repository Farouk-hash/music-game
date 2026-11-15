// admin/src/hooks/useAdminCatalog.js
import { useQuery } from '@tanstack/react-query';

const CF_BASE = import.meta.env.VITE_CF_BASE
  || 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev';

/**
 * Fetches the Worker's /game/catalog endpoint.
 * Returns everything the template editor needs:
 *   - genres, artists (with genre_ids), years, counts
 */
export function useAdminCatalog() {
  const q = useQuery({
    queryKey: ['admin', 'catalog'],
    queryFn: async () => {
      const res = await fetch(`${CF_BASE}/game/catalog`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    genres:  q.data?.genres  ?? [],
    artists: q.data?.artists ?? [],
    years:   q.data?.years   ?? [],
    counts:  q.data?.counts  ?? null,
    loading: q.isLoading,
    error:   q.error,
  };
}