// admin/src/hooks/useTemplates.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi } from '../../../lib/templatesApi';

const KEY = ['admin', 'templates'];

/**
 * List all templates (admin view — no auth required for read, but the
 * fetch includes ?admin_key just so the backend accepts it).
 *
 *   const { templates, loading, error } = useTemplates();
 */
export function useTemplates() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: KEY,
    queryFn: () => templatesApi.list(),
  });

  const templates = q.data?.templates ?? [];

  const create = useMutation({
    mutationFn: (body) => templatesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const save = useMutation({
    mutationFn: ({ id, body }) => templatesApi.save(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: (id) => templatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    templates,
    total: q.data?.total ?? templates.length,
    loading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
    create,
    save,
    remove,
  };
}

/**
 * Fetch a single template by ID.
 *
 *   const { template, loading, error } = useTemplate(id);
 */
export function useTemplate(id) {
  const q = useQuery({
    queryKey: [...KEY, id],
    queryFn: () => templatesApi.get(id),
    enabled: !!id,
  });

  return {
    template: q.data?.template ?? null,
    loading: q.isLoading,
    error: q.error,
  };
}