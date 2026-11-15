// admin/src/routes/Templates.jsx
import { useState, useMemo } from 'react';
import {  useNavigate } from 'react-router-dom';
import { useTemplates } from '../../hooks/cloud-flare/Templates/useTemplates';
import { templatesApi } from '../../lib/templatesApi';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingBlock } from '../../components/ui/Spinner';
import { SearchBar } from '../../components/ui/SearchBar';
import { BackLink } from '../../components/layout/BackLink';

export default function Templates() {
  const navigate = useNavigate();
  const { templates, total, loading, error, remove } = useTemplates();
  const [search, setSearch] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    );
  }, [templates, search]);

  async function handleDelete() {
    if (!confirmingDelete) return;
    try {
      await remove.mutateAsync(confirmingDelete.id);
      setConfirmingDelete(null);
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <BackLink to="/">Home</BackLink>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Templates</h1>
          <p className="text-sm text-ink-muted mt-1">
            Server-curated presets. Players can start a game from these without any setup.
          </p>
          <p className="text-xs text-ink-subtle mt-1">
            Order is controlled by the "Sort order" field on each template.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">{total} total</Badge>
          <Button variant="primary" onClick={() => navigate('/templates/new')}>
            + New template
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchBar
            initialValue={search}
            onSubmit={setSearch}
            placeholder="Search templates…"
            submitLabel="Search"
          />
        </div>
      </div>

      {loading && !templates.length ? (
        <LoadingBlock label="Loading templates…" />
      ) : error ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load templates"
          description={error.message}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="✨"
          title={search ? 'No matches' : 'No templates yet'}
          description={
            search
              ? 'Try a different search.'
              : 'Create your first template to get started.'
          }
          action={
            !search && (
              <Button variant="primary" onClick={() => navigate('/templates/new')}>
                Create template
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div
              key={t.id}
              className="card p-4 space-y-3 flex flex-col"
            >
              {/* Header: cover + name */}
              <div className="flex items-start gap-3 min-w-0">
                {t.cover?.kind === 'uploaded' ? (
                  <img
                    src={templatesApi.coverUrl(t.id)}
                    alt=""
                    className="w-12 h-12 rounded-md object-cover ring-1 ring-surface-border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-brand-500/20 flex items-center justify-center text-brand-500 font-bold shrink-0">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink truncate">{t.name}</p>
                    {t.isPublic ? (
                      <Badge variant="success">Public</Badge>
                    ) : (
                      <Badge variant="warning">Private</Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    #{t.sortOrder} · {t.levels.length} level
                    {t.levels.length === 1 ? '' : 's'} · {t.rounds.length} round
                    {t.rounds.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {t.description && (
                <p className="text-xs text-ink-muted line-clamp-2">
                  {t.description}
                </p>
              )}

              {/* Scope summary */}
              <div className="text-[11px] text-ink-subtle space-y-0.5">
                <p>
                  <span className="text-ink-muted">Genres:</span>{' '}
                  {t.genresIds.length === 0
                    ? 'all'
                    : `${t.genresIds.length} selected`}
                </p>
                <p>
                  <span className="text-ink-muted">Artists:</span>{' '}
                  {t.artistsIds.length === 0
                    ? 'all in scope'
                    : `${t.artistsIds.length} selected`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-surface-border mt-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/templates/${t.id}`)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(t)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface rounded-lg border border-surface-border p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-semibold text-ink">
              Delete "{confirmingDelete.name}"?
            </h2>
            <p className="text-sm text-ink-muted">
              This will permanently remove the template and its cover from the server.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmingDelete(null)}
                disabled={remove.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                disabled={remove.isPending}
              >
                {remove.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}