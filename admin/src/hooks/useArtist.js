// src/hooks/useArtist.js
import { useApiQuery } from './useApiQuery';

export function useArtist(slug, { tracksLimit = 100, albumsLimit = 50 } = {}) {
  const path = slug
    ? `/artists/${encodeURIComponent(slug)}?tracksLimit=${tracksLimit}&albumsLimit=${albumsLimit}`
    : null;

  const { data, error, isLoading } = useApiQuery(
    ['artist', slug, tracksLimit, albumsLimit],
    path
  );

  return {
    artist:       data?.artist ?? null,
    tracks:       data?.tracks ?? [],
    topTracks:    data?.topTracks ?? [],
    mostPlayed:   data?.mostPlayed ?? [],
    albums:       data?.albums ?? [],
    singlesCount: data?.singlesCount ?? 0,
    tracksTotal:  data?.tracksTotal ?? 0,
    albumsTotal:  data?.albumsTotal ?? 0,
    loading: isLoading,
    error,
  };
}