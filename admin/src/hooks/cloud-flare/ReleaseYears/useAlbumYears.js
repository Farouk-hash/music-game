// admin/src/hooks/cloud-flare/useAlbumYears.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api.js';

/* Build a querystring from a filter object. Drops null/undefined/''. */
function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function useAlbumYears(filters = {}) {
  return useQuery({
    queryKey: ['albumYears', 'list', filters],
    queryFn:  () => api.get(`/cloudflare/album-years${qs(filters)}`),
  });
}

export function useAlbumYearById(id) {
  return useQuery({
    queryKey: ['albumYears', 'byId', id],
    queryFn:  () => api.get(`/cloudflare/album-years/${id}`),
    enabled:  !!id,
  });
}

export function useAlbumYearsByArtist(artistId) {
  return useQuery({
    queryKey: ['albumYears', 'byArtist', artistId],
    queryFn:  () => api.get(`/cloudflare/album-years/by-artist${qs({ artist_id: artistId })}`),
    enabled:  !!artistId,
  });
}

export function useAlbumYearsStats() {
  return useQuery({
    queryKey: ['albumYears', 'stats'],
    queryFn:  () => api.get('/cloudflare/album-years/stats'),
  });
}