// admin/src/hooks/cloud-flare/useLyricsMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

/* ═══════════════════════════════════════════════════════════
   Mutations for /cloudflare/lyrics/*
   Invalidates the whole ['lyrics'] query family on success.
   ═══════════════════════════════════════════════════════════ */

export function useLyricsMutations() {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['lyrics'] });
  };

  /* ── Edit one row ─────────────────────────────── */

  const editMutation = useMutation({
    mutationFn: ({ id, lyrics }) =>
      api.put(`/cloudflare/lyrics/${id}`, { lyrics }),
    onSuccess: invalidateAll,
  });

  /* ── Remove one row ───────────────────────────── */

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/lyrics/${id}`),
    onSuccess: invalidateAll,
  });

  /* ── Create one row ───────────────────────────── */

  const createMutation = useMutation({
    mutationFn: ({ artistId, trackName, lyrics = null }) =>
      api.post('/cloudflare/lyrics', {
        artist_id:  artistId,
        track_name: trackName,
        lyrics,
      }),
    onSuccess: invalidateAll,
  });

  /* ── Bulk upsert ──────────────────────────────── */

  const bulkMutation = useMutation({
    mutationFn: (items) =>
      api.post('/cloudflare/lyrics/bulk', { items }),
    onSuccess: invalidateAll,
  });

  return {
    // actions
    edit:            editMutation.mutate,
    editAsync:       editMutation.mutateAsync,
    remove:          removeMutation.mutate,
    removeAsync:     removeMutation.mutateAsync,       // ← added, useful for the delete flow too
    create:          createMutation.mutate,
    createAsync:     createMutation.mutateAsync,       // ← added, symmetric
    bulkInsert:      bulkMutation.mutate,
    bulkInsertAsync: bulkMutation.mutateAsync,         // ← the fix

    // flags
    isEditing:        editMutation.isPending,
    isRemoving:       removeMutation.isPending,
    isCreating:       createMutation.isPending,
    isBulkInserting:  bulkMutation.isPending,

    // which row is being touched
    editingId:      editMutation.variables?.id      ?? null,
    removingId:     removeMutation.variables        ?? null,

    // errors
    editError:       editMutation.error,
    removeError:     removeMutation.error,
    createError:     createMutation.error,
    bulkInsertError: bulkMutation.error,

    // reset helpers
    resetEdit:       editMutation.reset,
    resetRemove:     removeMutation.reset,
    resetCreate:     createMutation.reset,
    resetBulk:       bulkMutation.reset,
  };
}