// game/src/hooks/templates/useTemplates.js
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '@/lib/templatesApi.js';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Client-side list of public templates.
 * Cached for 7 days on the client AND persisted to localStorage.
 * Only refetches when the templates version is bumped by the admin.
 */
export function useTemplates() {
  const templatesVersion = localStorage.getItem('game.templatesVersion') || 'v1';

  const q = useQuery({
    queryKey: ['game-templates', templatesVersion],
    queryFn: ({ signal }) => templatesApi.list({ signal }),
    staleTime: ONE_WEEK,
    gcTime: ONE_WEEK,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    queryKey: ['game-template', id],
    queryFn: ({ signal }) => templatesApi.get(id, { signal }),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,   // memory-only, not persisted
    refetchOnWindowFocus: false,
  });

  return {
    template: q.data?.template ?? null,
    isLoading: q.isLoading,
    error: q.error,
  };
}