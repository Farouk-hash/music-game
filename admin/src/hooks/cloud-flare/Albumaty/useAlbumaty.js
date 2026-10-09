// admin/src/hooks/cloud-flare/useAlbumaty.js
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api.js';

/* ═══════════════════════════════════════════════════════════
   Singers list (live-fetched from Express, cached 5 min)
   ═══════════════════════════════════════════════════════════ */

export function useAlbumatySingers() {
  return useQuery({
    queryKey: ['albumaty', 'singers'],
    queryFn:  () => api.get('/albumaty/singers'),
    staleTime: 5 * 60 * 1000,
  });
}

/* ═══════════════════════════════════════════════════════════
   Crawl one artist — used per cart row
   ═══════════════════════════════════════════════════════════ */

export function useCrawlArtist() {
  return useMutation({
    mutationFn: (albumatyId) => api.post('/albumaty/crawl', { albumatyId }),
  });
}