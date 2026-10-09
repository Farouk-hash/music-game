// admin/src/hooks/cloud-flare/useArtistAlbumNames.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api.js';

/**
 * Distinct album names for one artist, taken from `tracks.album_name`.
 * Used to suggest album names when creating an album_years row.
 *
 * Returns { data: { albumNames: string[], count: number } }
 */
export function useArtistAlbumNames(artistId) {
  return useQuery({
    queryKey: ['artistAlbumNames', artistId],
    queryFn: async () => {
      // /cloudflare/tracks accepts artist_id + limit. We fetch a
      // generous cap and dedupe client-side; album names per artist
      // are small in practice.
      const r = await api.get(`/cloudflare/tracks?artist_id=${artistId}&limit=1000`);
      const rows = r?.tracks ?? [];
      const seen = new Set();
      const albumNames = [];
      for (const row of rows) {
        const name = row?.album_name;
        if (!name) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        albumNames.push(name);
      }
      albumNames.sort((a, b) => a.localeCompare(b, 'ar'));
      return { albumNames, count: albumNames.length };
    },
    enabled: Number.isInteger(Number(artistId)) && Number(artistId) > 0,
    staleTime: 60_000,
  });
}