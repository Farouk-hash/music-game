// admin/src/hooks/cloud-flare/useAlbumYearMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api.js';

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: ['albumYears'] });
}

export function useAlbumYearMutations() {
  const qc = useQueryClient();

  /* ── CREATE (single) ──────────────────────────────── */
  const createMut = useMutation({
    mutationFn: ({ artistId, albumName, releasedYear }) =>
      api.post('/cloudflare/album-years', {
        artist_id:     artistId,
        album_name:    albumName,
        released_year: releasedYear,
      }),
    onSuccess: () => invalidate(qc),
  });

  /* ── EDIT ─────────────────────────────────────────── */
  const editMut = useMutation({
    mutationFn: ({ id, albumName, releasedYear }) => {
      const body = {};
      if (albumName    != null) body.album_name    = albumName;
      if (releasedYear != null) body.released_year = releasedYear;
      return api.put(`/cloudflare/album-years/${id}`, body);
    },
    onSuccess: () => invalidate(qc),
  });

  /* ── REMOVE ───────────────────────────────────────── */
  const removeMut = useMutation({
    mutationFn: ({ id }) => api.delete(`/cloudflare/album-years/${id}`),
    onSuccess: () => invalidate(qc),
  });

  /* ── BULK UPSERT ──────────────────────────────────── */
  const bulkMut = useMutation({
    mutationFn: ({ items }) => api.post('/cloudflare/album-years/bulk', { items }),
    onSuccess: () => invalidate(qc),
  });

  return {
    // create
    create:            createMut.mutate,
    createAsync:       createMut.mutateAsync,
    isCreating:        createMut.isPending,
    createError:       createMut.error,

    // edit
    edit:              editMut.mutate,
    editAsync:         editMut.mutateAsync,
    isEditing:         editMut.isPending,
    editingId:         editMut.variables?.id ?? null,
    editError:         editMut.error,

    // remove
    remove:            removeMut.mutate,
    removeAsync:       removeMut.mutateAsync,
    isRemoving:        removeMut.isPending,
    removingId:        removeMut.variables?.id ?? null,
    removeError:       removeMut.error,

    // bulk
    bulkUpsert:        bulkMut.mutate,
    bulkUpsertAsync:   bulkMut.mutateAsync,
    isBulkUpserting:   bulkMut.isPending,
    bulkUpsertError:   bulkMut.error,
  };
}