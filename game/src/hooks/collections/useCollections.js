// game/src/hooks/collections/useCollections.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/collectionsApi.js';

const LIST_KEY = (pid) => ['collections', pid];

export function useCollections(profileId) {
  return useQuery({
    queryKey: LIST_KEY(profileId),
    queryFn: ({ signal }) => collectionsApi.list(profileId, { signal }),
    select: (data) => data?.mine ?? [],
    enabled: !!profileId,
    staleTime: 30 * 1000,
  });
}

export function useOtherCollections(profileId) {
  return useQuery({
    queryKey: LIST_KEY(profileId),
    queryFn: ({ signal }) => collectionsApi.list(profileId, { signal }),
    select: (data) => data?.others ?? [],
    enabled: !!profileId,
    staleTime: 30 * 1000,
  });
}

export function useCollection(profileId, id) {
  return useQuery({
    queryKey: ['collection', profileId, id],
    queryFn: ({ signal }) => collectionsApi.get(profileId, id, { signal }),
    select: (data) => data?.collection ?? null,
    enabled: !!profileId && !!id,
    staleTime: 30 * 1000,
  });
}

/* ── Optimistic cache helpers ──────────────────────────── */

function upsertInList(qc, profileId, collection) {
  qc.setQueryData(LIST_KEY(profileId), (old) => {
    if (!old?.mine) return old;
    const exists = old.mine.some((c) => c.id === collection.id);
    const next = exists
      ? old.mine.map((c) => (c.id === collection.id ? collection : c))
      : [collection, ...old.mine];
    return { ...old, mine: next };
  });
}

function removeFromList(qc, profileId, id) {
  qc.setQueryData(LIST_KEY(profileId), (old) => {
    if (!old?.mine) return old;
    return { ...old, mine: old.mine.filter((c) => c.id !== id) };
  });
}

/* ── Mutations ──────────────────────────────────────────── */

export function useCreateCollection(profileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, file }) => collectionsApi.create(profileId, body, file),
    onSuccess: (data) => {
      upsertInList(qc, profileId, data.collection);
      qc.invalidateQueries({ queryKey: LIST_KEY(profileId) });
    },
  });
}

export function useCloneCollection(profileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, name }) => collectionsApi.clone(profileId, { sourceId, name }),
    onSuccess: () => {
      // Easiest to refetch the list for clones as the backend handles the join
      qc.invalidateQueries({ queryKey: LIST_KEY(profileId) });
    },
  });
}

export function useSaveCollection(profileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, file }) => collectionsApi.save(profileId, id, body, file),
    onSuccess: (data, vars) => {
      upsertInList(qc, profileId, data.collection);
      qc.setQueryData(['collection', profileId, vars.id], { collection: data.collection });
      qc.invalidateQueries({ queryKey: LIST_KEY(profileId) });
      qc.invalidateQueries({ queryKey: ['collection', profileId, vars.id] });
    },
  });
}

export function useDeleteCollection(profileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => collectionsApi.remove(profileId, id),
    onSuccess: (_, id) => {
      removeFromList(qc, profileId, id);
      qc.invalidateQueries({ queryKey: LIST_KEY(profileId) });
    },
  });
}

export function useUploadCover(profileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }) => collectionsApi.uploadCover(profileId, id, file),
    onSuccess: (data, vars) => {
      if (data?.collection) {
        upsertInList(qc, profileId, data.collection);
        qc.setQueryData(['collection', profileId, vars.id], { collection: data.collection });
      }
      qc.invalidateQueries({ queryKey: LIST_KEY(profileId) });
      qc.invalidateQueries({ queryKey: ['collection', profileId, vars.id] });
    },
  });
}

export function useRemoveCover(profileId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => collectionsApi.removeCover(profileId, id),
    onSuccess: (data, id) => {
      if (data?.collection) {
        upsertInList(qc, profileId, data.collection);
        qc.setQueryData(['collection', profileId, id], { collection: data.collection });
      }
      qc.invalidateQueries({ queryKey: LIST_KEY(profileId) });
      qc.invalidateQueries({ queryKey: ['collection', profileId, id] });
    },
  });
}