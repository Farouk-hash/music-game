// src/hooks/useAlbumsTracks.js
import { useState } from 'react';
import { api } from '../../lib/api';

/**
 * Fetches the tracklist for multiple albums in parallel.
 *
 *   const { fetchTracks, loading, error } = useAlbumsTracks();
 *   const tracks = await fetchTracks([142, 143, 144]);
 *
 * The returned array is a flat merge of every album's tracks, each
 * track augmented with a `_albumId` and `_albumName` field for
 * later display.
 */
export function useAlbumsTracks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchTracks(albumIds) {
    setLoading(true);
    setError(null);
    try {
      // Fetch all albums in parallel
      const responses = await Promise.all(
        albumIds.map(async (albumId) => {
          try {
            const data = await api.get(`/albums/${albumId}`);
            const album = data?.album ?? {};
            const tracks = data?.tracks ?? [];
            return tracks.map(t => ({
              ...t,
              _albumId: albumId,
              _albumName: album.name ?? album.title ?? `Album ${albumId}`,
            }));
          } catch (e) {
            console.error(`[useAlbumsTracks] album ${albumId} failed:`, e.message);
            return []; // skip failed albums
          }
        })
      );

      // Flatten
      const allTracks = responses.flat();

      if (allTracks.length === 0) {
        throw new Error('No tracks found in the selected albums');
      }

      return allTracks;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { fetchTracks, loading, error };
}