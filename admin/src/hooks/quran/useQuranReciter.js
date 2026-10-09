// src/hooks/useQuranReciter.js
import { useApiQuery } from '../useApiQuery';

export function useQuranReciter(id) {
  const path = id ? `/quran/reciters/${id}` : null;

  const { data, error, isLoading } = useApiQuery(
    ['quran-reciter', id],
    path
  );

  return {
    reciter: data?.reciter ?? null,
    moshafs: data?.moshafs ?? [],
    surahs: data?.surahs ?? [],
    loading: isLoading,
    error,
  };
}