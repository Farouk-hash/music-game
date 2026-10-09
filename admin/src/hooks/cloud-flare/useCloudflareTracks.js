// src/hooks/cloud-flare/useCloudflareTracks.js
import { useMemo } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '../useApiQuery';
import { parseR2Key } from '../../lib/r2Key';

const POSITION_ORDER = { start: 0, middle: 1, end: 2, custom: 3 };

/**
 * Fetch a page of slots from Cloudflare and expand them into
 * per-rendition clips.
 *
 * Pagination is SERVER-SIDE. The hook does not filter locally.
 * Every filter (artistId, position, search, albumName) becomes a
 * query param on the Worker request.
 *
 *   useCloudflareTracks({
 *     page: 1,        // 1-based
 *     perPage: 24,
 *     artistId: '',
 *     position: '',
 *     search: '',
 *     albumName: '',
 *   })
 *   // → { groups, totals, loading, error, refetch }
 *   // totals = { clips, tracks, artists, total } — page-scoped except `total`
 */
export function useCloudflareTracks({
  page = 1,
  perPage = 24,
  artistId = '',
  position = '',
  search = '',
  albumName = '',
} = {}) {
  const offset = Math.max(0, (page - 1) * perPage);

  // Build the request query string
  const params = new URLSearchParams();
  if (artistId)   params.set('artist_id', String(artistId));
  if (position)   params.set('position', position);
  if (search)     params.set('search', search);
  if (albumName)  params.set('album_name', albumName);
  params.set('limit', String(perPage));
  params.set('offset', String(offset));

  const qs = `?${params.toString()}`;

  const tracksQuery = useApiQuery(
    ['cloudflare-tracks', 'page', page, perPage, artistId, position, search, albumName],
    '/cloudflare/tracks' + qs,
    { placeholderData: keepPreviousData }   // don't blank the UI while paginating
  );

  // Artists for the dropdown come from a SEPARATE hook (useTrackArtists).

  const groups = useMemo(() => {
    const rows = tracksQuery.data?.tracks ?? [];

    const map = new Map();

    function pushClip(row, rendition, r2Key) {
      // Group by (artist_id, name). Rows on the same page that share
      // this key collapse into one group. Cross-page groups can't
      // happen because the Worker orders by (artist_id, name, position).
      const key = `${row.artist_id ?? 'null'}::${row.name}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          artistId: row.artist_id ?? null,
          artistName: `Artist #${row.artist_id ?? '?'}`,  // filled by the page from useTrackArtists
          trackName: row.name,
          album_name: row.album_name ?? null,
          featured_artists: row.featured_artists ?? null,
          clips: [],
        });
      }

      const parsed = parseR2Key(r2Key);
      const compositeId = `${row.id}:${rendition === 'reversed' ? 'rev' : 'fwd'}`;

      map.get(key).clips.push({
        id: compositeId,
        rowId: row.id,
        rendition,
        name: row.name,
        artist_id: row.artist_id ?? null,
        position: row.position ?? null,
        label: row.label ?? null,
        r2_key: r2Key,
        r2_reversed_key: row.r2_reversed_key ?? null,
        parsedTrackId: parsed?.trackId ?? null,
        durationSec: parsed?.durationSec ?? null,
        album_name: row.album_name ?? null,
        featured_artists: row.featured_artists ?? null,
      });
    }

    for (const row of rows) {
      if (row.r2_key) pushClip(row, 'forward', row.r2_key);
      if (row.r2_reversed_key) pushClip(row, 'reversed', row.r2_reversed_key);
    }

    const sortedGroups = [...map.values()].sort((a, b) => {
      const artistCmp = (a.artistName || '').localeCompare(b.artistName || '', 'ar');
      if (artistCmp !== 0) return artistCmp;
      return (a.trackName || '').localeCompare(b.trackName || '', 'ar');
    });

    for (const g of sortedGroups) {
      g.clips.sort((a, b) => {
        const oa = POSITION_ORDER[a.position] ?? 99;
        const ob = POSITION_ORDER[b.position] ?? 99;
        if (oa !== ob) return oa - ob;
        if (a.rowId !== b.rowId) return a.rowId - b.rowId;
        if (a.rendition === b.rendition) return 0;
        return a.rendition === 'forward' ? -1 : 1;
      });
    }

    return sortedGroups;
  }, [tracksQuery.data]);

  const totals = useMemo(() => {
    const artistIds = new Set();
    let clips = 0;
    let rows = 0;
    for (const g of groups) {
      clips += g.clips.length;
      const slotIds = new Set(g.clips.map(c => c.rowId));
      rows += slotIds.size;
      if (g.artistId != null) artistIds.add(g.artistId);
    }

    const serverTotal = tracksQuery.data?.total ?? 0;
    return {
      clips,                          // page-scoped
      tracks: rows,                   // page-scoped
      artists: artistIds.size,        // page-scoped
      total: serverTotal,             // catalogue-wide
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(serverTotal / perPage)),
    };
  }, [groups, tracksQuery.data, page, perPage]);

  return {
    groups,
    totals,
    loading: tracksQuery.isLoading,
    isFetching: tracksQuery.isFetching,
    error: tracksQuery.error,
    refetch: () => tracksQuery.refetch(),
  };
}