// src/hooks/cloud-flare/useArtistAdmin.js
import { useState, useMemo } from 'react';
import { useCloudflareGenres } from './useCloudflareGenres';
import { useCloudflareArtists } from './useCloudflareArtists';
import { useCloudflareArtistMutations } from './useCloudflareArtistMutations';

/**
 * Shared state for artist admin (modal, mutations, published set).
 *
 *   const admin = useArtistAdmin({ genreId });
 *   admin.openFor(artist);           // open modal for a source artist
 *   admin.openCustom();              // open modal for a fresh custom one
 *   admin.editing                    // the artist being edited (or null)
 *   admin.isModalOpen                // boolean
 *   admin.form, admin.setForm
 *   admin.submit()
 *   admin.close()
 *   admin.publishedIds               // Set<number>
 *   admin.pendingIds                 // Set<number>
 *   admin.remove(artist)             // delete from Cloudflare
 *   admin.genreOptions               // [{ value, label }]
 *
 * `form.source` carries the D1 `source` column value (read-only in the
 * modal). It is preserved on edit and defaults to 'manual' for new
 * custom artists created through the admin UI.
 */
export function useArtistAdmin({ genreId, defaultGenreIds = [] } = {}) {
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
    ids: publishedIds,
    count: publishedCount,
    loading: publishedLoading,
    byId: publishedById,
  } = useCloudflareArtists({ genreId });

  const {
    push, edit, remove,
    isPushing, isEditing, isRemoving,
    pushingId, editingId, removingId,
  } = useCloudflareArtistMutations();

  const pendingIds = useMemo(() => {
    const s = new Set();
    if (isPushing && pushingId != null) s.add(pushingId);
    if (isEditing && editingId != null) s.add(editingId);
    if (isRemoving && removingId != null) s.add(removingId);
    return s;
  }, [isPushing, isEditing, isRemoving, pushingId, editingId, removingId]);

  // ── Modal state ──────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [source, setSource] = useState(null);   // 'matb3aa' | 'custom' | null
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    genre_ids: [],
    image: '',
    source: '',                                  // D1 source column
  });

  const isEditMode = editing != null;

  /** Open the modal for an artist (existing in Cloudflare, or from matb3aa). */
  function openFor(artist) {
    const existing = publishedById.get(artist.id);

    if (existing) {
      // Already published — edit mode
      setForm({
        id: String(existing.id),
        name: existing.name,
        genre_ids: existing.genre_ids ?? [],
        image: existing.image ?? '',
        source: existing.source ?? 'matb3aa',
      });
      setEditing(existing);
      setSource(existing.is_customized ? 'custom' : 'matb3aa');
    } else {
      // Not published — prepare to create from matb3aa source
      setForm({
        id: String(artist.id),
        name: artist.name,
        genre_ids: defaultGenreIds,
        image: artist.image_small ?? artist.image ?? '',
        source: 'matb3aa',
      });
      setEditing(null);
      setSource('matb3aa');
    }

    setModalError(null);
    setIsModalOpen(true);
  }

  /** Open a blank modal for a brand-new custom artist. */
  function openCustom() {
    setForm({
      id: '',
      name: '',
      genre_ids: defaultGenreIds,
      image: '',
      source: 'manual',
    });
    setEditing(null);
    setSource('custom');
    setModalError(null);
    setIsModalOpen(true);
  }

  /**
   * Open a modal to create/update an artist from a non-matb3aa source
   * (e.g. albumaty). Uses a random 90000+ ID and marks is_customized = 1.
   */
  function openForSource({ name, image, genreIds = defaultGenreIds, source: src = 'albumaty' } = {}) {
    const randomId = 90000 + Math.floor(Math.random() * 10000);
    setForm({
      id: String(randomId),
      name: name ?? '',
      genre_ids: genreIds,
      image: image ?? '',
      source: src,
    });
    setEditing(null);
    setSource('custom');
    setModalError(null);
    setIsModalOpen(true);
  }

  function close() {
    if (submitting) return;
    setIsModalOpen(false);
    setEditing(null);
    setSource(null);
  }

  async function submit(e) {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim()) {
      setModalError('Name is required');
      return;
    }
    if (!Array.isArray(form.genre_ids) || form.genre_ids.length === 0) {
      setModalError('At least one genre is required');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        // Update existing Cloudflare row. Source is preserved read-only,
        // so we send the existing value back unchanged.
        await edit(editing.id, {
          name: form.name.trim(),
          genre_ids: form.genre_ids,
          image: form.image.trim() || null,
          source: form.source || undefined,
        });
      } else {
        const id = Number(form.id);
        if (!Number.isInteger(id)) {
          setModalError('ID must be a whole number');
          setSubmitting(false);
          return;
        }

        const alreadyPublished = publishedById.has(id);
        if (alreadyPublished) {
          // Race condition: row appeared between open and submit
          await edit(id, {
            name: form.name.trim(),
            genre_ids: form.genre_ids,
            image: form.image.trim() || null,
            source: form.source || undefined,
          });
        } else {
          await push({
            id,
            name: form.name.trim(),
            genre_ids: form.genre_ids,
            image: form.image.trim() || null,
            // custom artists are marked 1; matb3aa-sourced keep 0
            is_customized: source === 'custom' ? 1 : 0,
            // the source column defaults to 'matb3aa' if not set
            source: form.source || undefined,
          });
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

  async function removeArtist(artist) {
    if (!confirm(`Delete "${artist.name}" from Cloudflare?`)) return;
    try {
      await remove(artist.id);
    } catch (e) {
      console.error('[removeArtist]', e);
    }
  }

  return {
    // state
    isModalOpen,
    editing,
    isEditMode,
    source,
    form,
    setForm,
    submitting,
    modalError,

    // data
    publishedArtists,
    publishedIds,
    publishedCount,
    publishedLoading,
    genreOptions,
    pendingIds,

    // actions
    openFor,
    openCustom,
    openForSource,
    close,
    submit,
    removeArtist,
  };
}