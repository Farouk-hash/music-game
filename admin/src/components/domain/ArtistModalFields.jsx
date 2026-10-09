// src/components/domain/ArtistModalFields.jsx
import { Input } from '../ui/Input';
import { MultiSelect } from '../ui/MultiSelect';

/**
 * Form fields for the artist add/edit modal.
 *
 * Props:
 *   form          — { id, name, genre_ids, image, source }
 *   setForm       — state setter
 *   isEditMode    — true when editing an existing record
 *   genreOptions  — [{ value: 5, label: 'راب' }, ...]
 */
export function ArtistModalFields({ form, setForm, isEditMode, genreOptions }) {
  const sourceLabel = form.source || 'matb3aa';

  return (
    <>
      {isEditMode ? (
        <div className="space-y-1">
          <p className="text-xs text-ink-muted">
            Editing artist ID <span className="font-mono text-ink">{form.id}</span>
          </p>
          <p className="text-xs text-ink-muted">
            Source: <span className="text-ink capitalize">{sourceLabel}</span>
          </p>
        </div>
      ) : (
        <>
          <Input
            label="ID"
            name="id"
            type="number"
            placeholder="e.g. 90001"
            hint="Use 90000+ to avoid collision with matb3aa IDs."
            value={form.id}
            onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            required
          />

          {form.source && (
            <p className="text-xs text-ink-muted">
              Source: <span className="text-ink capitalize">{sourceLabel}</span>
            </p>
          )}
        </>
      )}

      <Input
        label="Name"
        name="name"
        placeholder="Artist name"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        required
      />

      <MultiSelect
        label="Genres"
        options={genreOptions}
        value={form.genre_ids}
        onChange={next => setForm(f => ({ ...f, genre_ids: next }))}
        placeholder="Search genres…"
        emptyMessage="No genres match"
      />

      <Input
        label="Image URL (optional)"
        name="image"
        type="url"
        placeholder="https://..."
        value={form.image}
        onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
      />
    </>
  );
}