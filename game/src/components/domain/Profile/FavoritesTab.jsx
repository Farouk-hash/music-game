// game/src/components/domain/Profile/FavoritesTab.jsx
import { useMemo, useState } from 'react';
import { useProfileContext } from '../../../context/ProfileContext.jsx';
import { useCatalog } from '../../../hooks/setup/useCatalog.js';
import { FavoritePicker } from './FavoritePicker.jsx';

/**
 * Question-type options — labels mirror QuestionTypePicker.
 * The `value` is what we store as the favourite.
 */
const QUESTION_TYPES = [
  { value: 'name-track',    label: 'Track name' },
  { value: 'name-artist',   label: 'Artist name' },
  { value: 'name-album',    label: 'Album name' },
  { value: 'name-featured', label: 'Featured artist' },
  { value: 'name-position', label: 'Clip position' },
  { value: 'lyrics-track',  label: 'Lyric → track' },
  { value: 'lyrics-artist', label: 'Lyric → artist' },
  { value: 'lyrics-album',  label: 'Lyric → album' },
];

export function FavoritesTab() {
  const { favorites, addFavorite, removeFavorite } = useProfileContext();
  const { data } = useCatalog();

  const genres   = data?.genres  ?? [];
  const artists  = data?.artists ?? [];

  // ── Lookup tables so we can render ids as names ────────────
  const genreById = useMemo(() => {
    const m = new Map();
    for (const g of genres) m.set(g.id, g.display_name ?? g.name ?? `Genre ${g.id}`);
    return m;
  }, [genres]);

  const artistById = useMemo(() => {
    const m = new Map();
    for (const a of artists) m.set(a.id, a.name ?? `Artist ${a.id}`);
    return m;
  }, [artists]);

  const typeBySlug = useMemo(() => {
    const m = new Map();
    for (const t of QUESTION_TYPES) m.set(t.value, t.label);
    return m;
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">
        Pick your favourites. The Setup screen has a "Favourites" button that
        plays them in one click.
      </p>

      <Section
        title="Genres"
        items={favorites.genres}
        renderName={(id) => genreById.get(id) ?? `Genre ${id}`}
        onRemove={(id) => removeFavorite('genre', id)}
        pickerItems={genres.map((g) => ({
          id: g.id,
          label: g.display_name ?? g.name ?? `Genre ${g.id}`,
        }))}
        selectedIds={new Set(favorites.genres)}
        onPickToggle={(id) => {
          if (favorites.genres.includes(id)) return removeFavorite('genre', id);
          return addFavorite('genre', id);
        }}
        searchPlaceholder="Search genres…"
      />

      <Section
        title="Artists"
        items={favorites.artists}
        renderName={(id) => artistById.get(id) ?? `Artist ${id}`}
        onRemove={(id) => removeFavorite('artist', id)}
        pickerItems={artists.map((a) => ({
          id: a.id,
          label: a.name ?? `Artist ${a.id}`,
          subtitle: `${a.tracks_count ?? 0} clips`,
        }))}
        selectedIds={new Set(favorites.artists)}
        onPickToggle={(id) => {
          if (favorites.artists.includes(id)) return removeFavorite('artist', id);
          return addFavorite('artist', id);
        }}
        searchPlaceholder="Search artists…"
      />

      <Section
        title="Question types"
        items={favorites.questionTypes}
        renderName={(slug) => typeBySlug.get(slug) ?? slug}
        onRemove={(slug) => removeFavorite('question-type', slug)}
        pickerItems={QUESTION_TYPES.map((t) => ({
          id: t.value,
          label: t.label,
        }))}
        selectedIds={new Set(favorites.questionTypes)}
        onPickToggle={(slug) => {
          if (favorites.questionTypes.includes(slug)) return removeFavorite('question-type', slug);
          return addFavorite('question-type', slug);
        }}
        searchable={false}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section — one list + inline add-picker
   ───────────────────────────────────────────────────────────── */

function Section({
  title,
  items,
  renderName,
  onRemove,
  pickerItems,
  selectedIds,
  onPickToggle,
  searchable = true,
  searchPlaceholder,
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {title}
          {items.length > 0 && (
            <span className="text-ink-subtle ml-2">({items.length})</span>
          )}
        </h4>

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-ink-muted hover:text-ink transition-colors"
        >
          {adding ? 'Done' : '+ Add'}
        </button>
      </div>

      {/* Current list */}
      {items.length === 0 ? (
        !adding && (
          <p className="text-xs text-ink-subtle">None yet.</p>
        )
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((id) => (
            <li
              key={id}
              className="
                inline-flex items-center gap-2
                px-3 h-8 rounded-md
                border border-border bg-surface-2
                text-xs text-ink
              "
            >
              <span className="truncate max-w-[12rem]">{renderName(id)}</span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="text-ink-subtle hover:text-wrong"
                aria-label={`Remove ${renderName(id)}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Inline picker */}
      {adding && (
        <FavoritePicker
          items={pickerItems}
          selectedIds={selectedIds}
          onToggle={onPickToggle}
          onClose={() => setAdding(false)}
          searchable={searchable}
          placeholder={searchPlaceholder}
        />
      )}
    </section>
  );
}