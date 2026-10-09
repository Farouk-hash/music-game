// src/hooks/useGenres.js
import { useApiQuery } from './useApiQuery';

export function useGenres() {
  const { data, error, isLoading } = useApiQuery(['genres'], '/genres');

  return {
    genres: data?.genres ?? [],
    count: data?.count ?? 0,
    loading: isLoading,
    error,
  };
}