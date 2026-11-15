// game/src/hooks/templates/useTemplates.js
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '@/lib/templatesApi.js';

/**
 * Client-side list of public templates.
 * Cached for 5 minutes — templates rarely change.
 *
 *   const { templates, isLoading, error } = useTemplates();
 */
export function useTemplates() {
  const q = useQuery({
    queryKey: ['templates', 'public'],
    queryFn: ({ signal }) => templatesApi.list({ signal }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    templates: q.data?.templates ?? [],
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  };
}

export function useTemplate(id) {
  const q = useQuery({
    queryKey: ['templates', 'byId', id],
    queryFn: ({ signal }) => templatesApi.get(id, { signal }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    template: q.data?.template ?? null,
    isLoading: q.isLoading,
    error: q.error,
  };
}