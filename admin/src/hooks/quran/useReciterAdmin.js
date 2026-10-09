// src/hooks/quran/useReciterAdmin.js
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCloudflareGenres } from '../cloud-flare/useCloudflareGenres';
import { useCloudflareArtists } from '../cloud-flare/useCloudflareArtists';
import { QURAN_GENRE_ID } from '../../lib/quran';

/**
 * Admin state for Quran reciters.
 *
 * Mirrors useArtistAdmin but scoped to Quran:
 *   - Fetches the full published artists list, filters by reciter IDs
 *   - Manages the publish/edit modal
 *   - Provides publish/edit/delete mutations
 *
 * Usage:
 *   const admin = useReciterAdmin();
 *   admin.openFor(reciter);      // opens modal (publish or edit)
 *   admin.publishedIds           // Set<number> of reciter IDs that are published
 *   admin.pendingIds             // Set<number> of reciter IDs currently mutating
 */
export function useReciterAdmin() {
  // ── Genre options (from Cloudflare) ─────────────────────
  const { genres: cfGenres } = useCloudflareGenres();

  const genreOptions = useMemo(
    () => cfGenres.map(g => ({
      value: g.id,
      label: g.display_name || g.name,
    })),
    [cfGenres]
  );

  const {
    artists: publishedArtists,
    loading: publishedLoading,
  } = useCloudflareArtists({ genreId: null });

  // ── Name-based lookup maps ─────────────────────────────
  // Published artists keyed by name — this is what "is a reciter published?"
  // checks against.
  const publishedByName = useMemo(
    () => new Map(publishedArtists.map(a => [a.name, a])),
    [publishedArtists]
  );

  const publishedByNameIds = useMemo(
    () => new Set(publishedArtists.map(a => a.name)),
    [publishedArtists]
  );

  // Existing behaviour: also keep the ID map around for other checks
  const publishedById = useMemo(
    () => new Map(publishedArtists.map(a => [a.id, a])),
    [publishedArtists]
  );
 

  // ── Mutations ───────────────────────────────────────────
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cloudflare-artists'] });
  };

  const publishMutation = useMutation({
    mutationFn: (reciter) =>
      api.post('/cloudflare/artists', {
        id: reciter.id,
        name: reciter.name,
        genre_ids: reciter.genre_ids ?? [],
        image: reciter.image ?? null,
        tracks_count: reciter.tracks_count ?? 0,
        is_customized: 0,
      }),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...body }) =>
      api.put(`/cloudflare/artists/${id}`, body),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/cloudflare/artists/${id}`),
    onSuccess: invalidate,
  });

  const pendingIds = useMemo(() => {
    const s = new Set();
    if (publishMutation.isPending && publishMutation.variables?.id != null) {
      s.add(publishMutation.variables.id);
    }
    if (editMutation.isPending && editMutation.variables?.id != null) {
      s.add(editMutation.variables.id);
    }
    if (removeMutation.isPending && removeMutation.variables != null) {
      s.add(removeMutation.variables);
    }
    return s;
  }, [
    publishMutation.isPending, publishMutation.variables,
    editMutation.isPending, editMutation.variables,
    removeMutation.isPending, removeMutation.variables,
  ]);

  // ── Modal state ────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [source, setSource] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    genre_ids: [],
    image: '',
  });

  const isEditMode = editing != null;

  /**
   * Open the modal for a reciter.
   * If the reciter is already published → edit mode, prefilled.
   * Otherwise → publish mode, prefilled with the reciter's name.
   */
  
  function openFor(reciter) {
    const existing = publishedByName.get(reciter.name);

    if (existing) {
      setForm({
        id: String(existing.id),
        name: existing.name,
        genre_ids: existing.genre_ids ?? [],
        image: existing.image ?? '',
      });
      setEditing(existing);
      setSource('quran');
    } else {
      // Prefill the Quran genre so the reciter is properly tagged
      setForm({
        id: String(reciter.id),
        name: reciter.name,
        genre_ids: [QURAN_GENRE_ID],
        image: reciter.image ?? '',
      });
      setEditing(null);
      setSource('quran');
    }

    setModalError(null);
    setIsModalOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim()) {
      setModalError('Name is required');
      return;
    }
    if (form.genre_ids != null && !Array.isArray(form.genre_ids)) {
      setModalError('genre_ids must be an array');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await editMutation.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          genre_ids: form.genre_ids,
          image: form.image.trim() || null,
        });
      } else {
        const id = Number(form.id);
        if (!Number.isInteger(id)) {
          setModalError('ID must be a whole number');
          setSubmitting(false);
          return;
        }

        // Check by name — is this reciter already published?
        const alreadyPublished = publishedByName.has(form.name.trim());

        if (alreadyPublished) {
          const existing = publishedByName.get(form.name.trim());
          // Update the existing row instead of creating a new one
          await editMutation.mutateAsync({
            id: existing.id,
            name: form.name.trim(),
            genre_ids: form.genre_ids,
            image: form.image.trim() || null,
          });
        } else {
          try {
            await publishMutation.mutateAsync({
              id,
              name: form.name.trim(),
              genre_ids: form.genre_ids,
              image: form.image.trim() || null,
            });
          } catch (err) {
            // 409 = ID already taken by another artist
            if (err.status === 409) {
              setModalError(
                `The ID ${id} is already used by another artist ("${err.body?.existingName ?? 'unknown'}"). ` +
                `Try a different ID or edit the existing artist.`
              );
              setSubmitting(false);
              return;
            }
            throw err;
          }
        }
      }
      setIsModalOpen(false);
      setEditing(null);
      setSource(null);
    } catch (err) {
      setModalError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    if (submitting) return;
    setIsModalOpen(false);
    setEditing(null);
    setSource(null);
  }


  async function removeReciter(reciter) {
    if (!confirm(`Remove "${reciter.name}" from Cloudflare?`)) return;
    try {
      await removeMutation.mutateAsync(reciter.id);
    } catch (e) {
      console.error('[removeReciter]', e);
    }
  }

  return {
    // Modal state
    isModalOpen,
    editing,
    isEditMode,
    source,
    form,
    setForm,
    submitting,
    modalError,

    // Data
    publishedByName,
    publishedByNameIds,
    publishedById,
    publishedCount: publishedArtists.length,
    publishedLoading,
    genreOptions,
    pendingIds,

    // Actions
    openFor,
    close,
    submit,
    removeReciter,
  };
}