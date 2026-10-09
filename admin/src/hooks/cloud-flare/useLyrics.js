// admin/src/hooks/cloud-flare/useLyrics.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

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

export function useLyrics(filters = {}) {
  return useQuery({
    queryKey: ['lyrics', 'list', filters],
    queryFn:  () => api.get(`/cloudflare/lyrics${qs(filters)}`),
  });
}

export function useLyricsById(id) {
  return useQuery({
    queryKey: ['lyrics', 'byId', id],
    queryFn:  () => api.get(`/cloudflare/lyrics/${id}`),
    enabled:  !!id,
  });
}

export function useLyricsByTrack(artistId, trackName) {
  return useQuery({
    queryKey: ['lyrics', 'byTrack', artistId, trackName],
    queryFn:  () => api.get(`/cloudflare/lyrics/by-track${qs({
      artist_id:  artistId,
      track_name: trackName,
    })}`),
    enabled:  !!artistId && !!trackName,
  });
}

export function useLyricsStats() {
  return useQuery({
    queryKey: ['lyrics', 'stats'],
    queryFn:  () => api.get('/cloudflare/lyrics/stats'),
  });
}