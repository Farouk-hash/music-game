// admin/src/hooks/cloud-flare/useInstruments.js
import { useMemo } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '../../useApiQuery';

/**
 * Fetch a page of instruments from the Worker.
 *
 * Filters:
 *   page, perPage, artistId, position, search
 *
 * Response includes { instruments: [...], count, total, limit, offset }.
 */
export function useInstruments({
  page = 1,
  perPage = 24,
  artistId = '',
  position = '',
  search = '',
} = {}) {
  const offset = Math.max(0, (page - 1) * perPage);

  const params = new URLSearchParams();
  if (artistId) params.set('artist_id', String(artistId));
  if (position) params.set('position', position);
  if (search)   params.set('search', search);
  params.set('limit', String(perPage));
  params.set('offset', String(offset));

  const qs = `?${params.toString()}`;

  const query = useApiQuery(
    ['instruments', 'page', page, perPage, artistId, position, search],
    '/cloudflare/remote/instruments' + qs,
    { placeholderData: keepPreviousData },
  );

  const rows = query.data?.instruments ?? [];

  // Group by (artist_id, track_name) → one entry per track,
  // with a segments map { middle: row, custom: row }.
  const tracks = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = `${r.artist_id}::${r.track_name}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          artistId: r.artist_id,
          trackName: r.track_name,
          albumName: r.album_name ?? null,
          sourceUrl: r.source_url ?? null,
          genreIds: r.genre_ids ?? [],
          segments: {},
        });
      }
      map.get(key).segments[r.position] = r;
    }
    return [...map.values()].sort((a, b) => {
      if (a.artistId !== b.artistId) return a.artistId - b.artistId;
      return (a.trackName || '').localeCompare(b.trackName || '', 'ar');
    });
  }, [rows]);

  const totals = useMemo(() => {
    const serverTotal = query.data?.total ?? query.data?.count ?? 0;
    return {
      total: serverTotal,
      instruments: rows.length,
      tracks: tracks.length,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(serverTotal / perPage)),
    };
  }, [query.data, rows.length, tracks.length, page, perPage]);

  return {
    tracks,
    totals,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => query.refetch(),
  };
}