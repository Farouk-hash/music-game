// src/hooks/useQuranReciters.js
import { useApiQuery } from '../useApiQuery';

export function useQuranReciters({ search = '' } = {}) {
  const path = search
    ? `/quran/reciters?search=${encodeURIComponent(search)}`
    : '/quran/reciters';

  const { data, error, isLoading } = useApiQuery(
    ['quran-reciters', search],
    path
  );

  return {
    reciters: data?.reciters ?? [],
    count: data?.count ?? 0,
    loading: isLoading,
    error,
  };
}