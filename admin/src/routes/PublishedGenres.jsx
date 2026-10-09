// src/routes/PublishedGenres.jsx
import { useState } from 'react';
import { useCloudflareGenres } from '../hooks/cloud-flare/useCloudflareGenres';
import { useCloudflareGenreMutations } from '../hooks/cloud-flare/useCloudflareGenreMutations';
import { useAlphabeticalGroups } from '../hooks/useAlphabeticalGroups';
import { GenreGrid } from '../components/domain/GenreGrid';
import { AlphabetFilter } from '../components/ui/AlphabetFilter';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingBlock } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { ModalForm } from '../components/Modal/ModalForm';
import { BackLink } from '../components/layout/BackLink';

export default function PublishedGenres() {
  const {
    genres: cloudflareGenres,
    ids: publishedIds,
    count,
    loading,
    error,
  } = useCloudflareGenres();

  const {
    push, edit, remove,
    isPushing, isEditing, isRemoving,
    pushingId, editingId, removingId,
  } = useCloudflareGenreMutations();

  const pendingIds = new Set();
  if (isPushing && pushingId != null) pendingIds.add(pushingId);
  if (isEditing && editingId != null) pendingIds.add(editingId);
  if (isRemoving && removingId != null) pendingIds.add(removingId);

  // Local filters
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState(null);

  const filtered = search
    ? cloudflareGenres.filter(g =>
        (g.display_name || g.name).toLowerCase().includes(search.toLowerCase())
      )
    : cloudflareGenres;

  const groups = useAlphabeticalGroups(filtered, { key: 'display_name' });
  const letters = groups.map(g => g.letter);
  const visible = activeLetter
    ? groups.find(g => g.letter === activeLetter)?.items ?? []
    : filtered;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', display_name: '', image: '' });

  const isEditMode = editing != null;

  function openAddModal() {
    setForm({ id: '', name: '', display_name: '', image: '' });
    setEditing(null);
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(genre) {
    setForm({
      id: String(genre.id),
      name: genre.name,
      display_name: genre.display_name,
      image: genre.image ?? '',
    });
    setEditing(genre);
    setModalError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setIsModalOpen(false);
    setEditing(null);
  }

  async function handleModalSubmit(e) {
    e.preventDefault();
    setModalError(null);

    if (!form.name.trim() || !form.display_name.trim()) {
      setModalError('Name and display name are required');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await edit(editing.id, {
          name: form.name.trim(),
          display_name: form.display_name.trim(),
          image: form.image.trim() || null,
        });
      } else {
        const id = Number(form.id);
        if (!Number.isInteger(id)) {
          setModalError('ID must be a whole number');
          setSubmitting(false);
          return;
        }
        await push({
          id,
          name: form.name.trim(),
          display_name: form.display_name.trim(),
          image: form.image.trim() || null,
          is_customized: 1,
        });
      }
      closeModal();
    } catch (err) {
      setModalError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(genre) {
    if (!confirm(`Delete "${genre.display_name}" from Cloudflare?`)) return;
    try {
      await remove(genre.id);
    } catch (e) {
      console.error('[delete]', e);
    }
  }

  if (loading && !cloudflareGenres.length) {
    return <LoadingBlock label="Loading published genres…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <BackLink to="/">Home</BackLink>

      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Published Genres</h1>
            <p className="text-sm text-ink-muted mt-1">
              {count} {count === 1 ? 'genre' : 'genres'} live in Cloudflare
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              Click any card to edit. Custom genres show no View link.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success">{count} published</Badge>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              + Add Custom Genre
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchBar
              initialValue={search}
              onSubmit={setSearch}
              placeholder="Filter by name…"
              submitLabel="Filter"
            />
          </div>
        </div>

        {letters.length > 1 && (
          <AlphabetFilter
            letters={letters}
            active={activeLetter}
            onSelect={setActiveLetter}
          />
        )}
      </header>

      {visible.length === 0 ? (
        <EmptyState
          icon="✨"
          title={cloudflareGenres.length === 0 ? 'Nothing published yet' : 'No matches'}
          description={
            cloudflareGenres.length === 0
              ? 'Publish genres from the Genres page, or add custom ones.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <GenreGrid
          genres={visible}
          syncedIds={publishedIds}
          pendingIds={pendingIds}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      <ModalForm
        open={isModalOpen}
        onClose={closeModal}
        title={isEditMode ? 'Edit Genre' : 'Add Custom Genre'}
        submitLabel={isEditMode ? 'Save Changes' : 'Create'}
        submitting={submitting}
        error={modalError}
        onSubmit={handleModalSubmit}
      >
        {isEditMode ? (
          <p className="text-xs text-ink-muted">
            Editing genre ID <span className="font-mono text-ink">{form.id}</span>
          </p>
        ) : (
          <Input
            label="ID"
            name="id"
            type="number"
            placeholder="e.g. 9001"
            hint="Use 9000+ to avoid collision with matb3aa IDs."
            value={form.id}
            onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            required
          />
        )}
        <Input
          label="Slug (name)"
          name="name"
          placeholder="e.g. chillout"
          hint="URL-safe identifier."
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Display Name"
          name="display_name"
          placeholder="e.g. Chillout"
          value={form.display_name}
          onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
          required
        />
        <Input
          label="Image URL (optional)"
          name="image"
          type="url"
          placeholder="https://..."
          value={form.image}
          onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
        />
      </ModalForm>
    </div>
  );
}