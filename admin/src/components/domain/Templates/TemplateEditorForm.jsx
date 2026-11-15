// admin/src/components/domain/Templates/TemplateEditorForm.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../../../hooks/cloud-flare/Templates/useTemplates';
import { templatesApi } from '../../../lib/templatesApi';
import { Button } from '../../ui/Button';
import { BackLink } from '../../layout/BackLink';
import { GenreSelector } from './GenreSelector';
import { ArtistSelector } from './ArtistSelector';
import { RoundEditor } from './RoundEditor';
import { YearSelector } from './YearSelector';
import { resizeImageToSquare } from '../../../hooks/cloud-flare/Templates/imageResize';

const EMPTY_ROUND = {
  level: 1,
  questionTypes: ['name-track'],
  answerMode: 'choose',
  mode: 'speed',
  rounds: 5,
  reversedAnswers: 'no',
  reversedAudio: false,
  instruments: 'none',
  timer: null,
};

const VALID_LEVELS = [1, 2, 3];

function makeEmptyForm() {
  return {
    name: '',
    description: '',
    sortOrder: 0,
    isPublic: false,
    levels: [1],
    years: null,
    genresIds: new Set(),
    artistsIds: new Set(),
    rounds: [{ ...EMPTY_ROUND }],
  };
}

function hydrateForm(existing) {
  return {
    name: existing.name ?? '',
    description: existing.description ?? '',
    sortOrder: existing.sortOrder ?? 0,
    isPublic: Boolean(existing.isPublic),
    levels: existing.levels ?? [1],
    years: existing.years ?? null,
    genresIds: new Set(existing.genresIds ?? []),
    artistsIds: new Set(existing.artistsIds ?? []),
    rounds: existing.rounds.length > 0
      ? existing.rounds.map(r => ({ ...r }))
      : [{ ...EMPTY_ROUND }],
  };
}

export function TemplateEditorForm({ initial }) {
  const navigate = useNavigate();
  const isNew = !initial;
  const { create, save } = useTemplates();

  // Lazy init — no useEffect, no setState-in-effect
  const [form, setForm] = useState(
    () => (initial ? hydrateForm(initial) : makeEmptyForm())
  );
  const [coverFile, setCoverFile] = useState(null);
  const [resizing, setResizing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const sortedLevels = useMemo(
    () => [...form.levels].sort((a, b) => a - b),
    [form.levels]
  );

  function toggleLevel(lv) {
    setForm(f => {
      const has = f.levels.includes(lv);
      const next = has
        ? f.levels.filter(l => l !== lv)
        : [...f.levels, lv].sort((a, b) => a - b);
      const valid = next.length > 0 ? next : [lv];
      return {
        ...f,
        levels: valid,
        rounds: f.rounds.map(r =>
          valid.includes(r.level) ? r : { ...r, level: valid[0] }
        ),
      };
    });
  }

  function toggleGenre(genreId) {
    setForm(f => {
      const next = new Set(f.genresIds);
      if (next.has(genreId)) next.delete(genreId);
      else next.add(genreId);
      return { ...f, genresIds: next };
    });
  }

  function toggleArtist(artistId) {
    setForm(f => {
      const next = new Set(f.artistsIds);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return { ...f, artistsIds: next };
    });
  }

  function updateRound(i, patch) {
    setForm(f => ({
      ...f,
      rounds: f.rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));
  }

  function addRound() {
    setForm(f => ({
      ...f,
      rounds: [...f.rounds, { ...EMPTY_ROUND, level: sortedLevels[0] }],
    }));
  }

  function removeRound(i) {
    setForm(f => {
      if (f.rounds.length <= 1) return f;
      return { ...f, rounds: f.rounds.filter((_, j) => j !== i) };
    });
  }

  

  async function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setCoverFile(null);
      return;
    }
    setError(null);
    setResizing(true);
    try {
      const resized = await resizeImageToSquare(file, 512, 0.85);
      setCoverFile(resized);
    } catch (err) {
      setError(`Image resize failed: ${err.message}`);
      setCoverFile(null);
    } finally {
      setResizing(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        sortOrder: Number(form.sortOrder) || 0,
        isPublic: Boolean(form.isPublic),
        levels: sortedLevels,
        years: form.years,
        genresIds: [...form.genresIds],
        artistsIds: [...form.artistsIds],
        rounds: form.rounds,
      };

      const res = isNew
        ? await create.mutateAsync(body)
        : await save.mutateAsync({ id: initial.id, body });

      const savedId = res?.template?.id ?? initial?.id;
      if (coverFile && savedId) {
        await templatesApi.uploadCover(savedId, coverFile);
      }

      navigate('/templates');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl">
      <BackLink to="/templates">Templates</BackLink>

      <h1 className="text-2xl font-bold text-ink">
        {isNew ? 'New template' : `Edit "${initial.name}"`}
      </h1>

      {error && (
        <div className="p-3 rounded-md border border-warning/40 bg-warning-subtle text-sm text-warning">
          {error}
        </div>
      )}

      {/* Basics */}
      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Basics</h2>

        <label className="block space-y-1">
          <span className="text-xs text-ink-muted">Name</span>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            maxLength={64}
            className="w-full h-10 px-3 rounded-md bg-surface-subtle border border-surface-border"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-ink-muted">Description</span>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 rounded-md bg-surface-subtle border border-surface-border resize-y"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          <label className="block space-y-1 w-32">
            <span className="text-xs text-ink-muted">Sort order</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
              min={0}
              className="w-full h-10 px-3 rounded-md bg-surface-subtle border border-surface-border"
            />
          </label>

          <label className="flex items-center gap-2 self-end h-10">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
            />
            <span className="text-sm text-ink">Public (visible to clients)</span>
          </label>
        </div>

       <label className="block space-y-1">
            <span className="text-xs text-ink-muted">
            Cover image (optional — resized to 512×512, max ~100 KB)
            </span>
            <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverChange}
            disabled={resizing}
            className="text-sm"
            />
            {resizing && <p className="text-xs text-ink-subtle">Resizing…</p>}
            {coverFile && !resizing && (
            <p className="text-xs text-correct">
                Ready: {coverFile.name} ({Math.round(coverFile.size / 1024)} KB)
            </p>
            )}
        </label>
      </section>

      {/* Levels */}
      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Levels</h2>
        <div className="flex gap-2">
          {VALID_LEVELS.map(lv => (
            <button
              key={lv}
              type="button"
              onClick={() => toggleLevel(lv)}
              aria-pressed={form.levels.includes(lv)}
              className={[
                'h-10 px-4 rounded-md border text-sm',
                form.levels.includes(lv)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-surface-subtle text-ink-muted border-surface-border hover:border-brand-500',
              ].join(' ')}
            >
              Level {lv}
            </button>
          ))}
        </div>
      </section>

      {/* Genres */}
      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Genres</h2>
        <GenreSelector selectedIds={form.genresIds} onToggle={toggleGenre} />
      </section>
    
     <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Release Years</h2>
        <p className="text-xs text-ink-muted">
          Limit the template to specific years, or leave as "Any year".
        </p>
        <YearSelector
          value={form.years}
          onChange={years => setForm(f => ({ ...f, years }))}
        />
      </section>
      {/* Artists */}
      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Artists</h2>
        <p className="text-xs text-ink-muted">
          Leave empty to include all artists in the selected genres.
        </p>
        <ArtistSelector
          genresSelected={form.genresIds}
          selectedIds={form.artistsIds}
          onToggle={toggleArtist}
        />
      </section>

      {/* Rounds */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">
            Rounds ({form.rounds.length})
          </h2>
          <Button variant="secondary" size="sm" onClick={addRound}>
            + Add round
          </Button>
        </div>

        {form.rounds.map((r, i) => (
          <RoundEditor
            key={i}
            round={r}
            index={i}
            total={form.rounds.length}
            availableLevels={sortedLevels}
            onUpdate={patch => updateRound(i, patch)}
            onRemove={() => removeRound(i)}
          />
        ))}
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate('/templates')}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </Button>
      </div>
    </div>
  );
}