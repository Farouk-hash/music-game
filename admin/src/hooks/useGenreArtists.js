// src/hooks/useGenreArtists.js
import { useApiQuery } from './useApiQuery';

export function useGenreArtists(slug, { maxPages = 10 } = {}) {
  const path = slug
    ? `/genres/${encodeURIComponent(slug)}/artists?maxPages=${maxPages}`
    : null;

  const { data, error, isLoading } = useApiQuery(
    ['genre-artists', slug, maxPages],
    path
  );

  return {
    genre: data?.genre ?? slug,
    artists: data?.artists ?? [],
    trackCount: data?.trackCount ?? 0,
    artistCount: data?.artistCount ?? 0,
    loading: isLoading,
    error,
  };
}