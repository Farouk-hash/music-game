import { useEffect, useMemo, useState } from 'react';
import { useProfileContext } from '../../../context/ProfileContext.jsx';
import { useCatalog } from '../../../hooks/setup/useCatalog.js';
import { FavoritePicker } from './FavoritePicker.jsx';
import { QUESTION_TYPES } from '../../../constants/questionTypes.js';
import { IconClose, IconWifiOff } from '../../../icons/index.js';
import { OfflineBlock } from '@/components/network/OfflineBlock.jsx'; // ✅ Reuse OfflineBlock
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js'; // ✅ Check connectivity

export function FavoritesTab() {
  const isOnline = useNetworkStatus();
  const { favorites, addFavorite, removeFavorite } = useProfileContext();
  const { data: catalog, isLoading: catalogLoading } = useCatalog();

  const genres   = catalog?.genres  ?? [];
  const artists  = catalog?.artists ?? [];

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

  // ✅ Show compact offline banner if catalog hasn't loaded yet due to no connection
  if (!isOnline && catalogLoading && genres.length === 0 && artists.length === 0) {
    return (
      <OfflineBlock 
        variant="banner"
        title="Favorites Unavailable"
        subtitle="Your favorites require an internet connection to load."
        onRetry={null}
        icon={<IconWifiOff className="w-5 h-5" />}
      />
    );
  }

  // ✅ Safe wrapper for adding favorites
  const safeAddFavorite = (kind, id) => {
    if (!isOnline) return;
    addFavorite(kind, id);
  };

  // ✅ Safe wrapper for removing favorites
  const safeRemoveFavorite = (kind, id) => {
    if (!isOnline) return;
    removeFavorite(kind, id);
  };

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
        onRemove={(id) => safeRemoveFavorite('genre', id)}
        pickerItems={genres.map((g) => ({
          id: g.id,
          label: g.display_name ?? g.name ?? `Genre ${g.id}`,
        }))}
        selectedIds={new Set(favorites.genres)}
        onPickToggle={(id) => {
          if (favorites.genres.includes(id)) return safeRemoveFavorite('genre', id);
          return safeAddFavorite('genre', id);
        }}
        searchPlaceholder="Search genres…"
        isOnline={isOnline}
      />

      <Section
        title="Artists"
        items={favorites.artists}
        renderName={(id) => artistById.get(id) ?? `Artist ${id}`}
        onRemove={(id) => safeRemoveFavorite('artist', id)}
        pickerItems={artists.map((a) => ({
          id: a.id,
          label: a.name ?? `Artist ${a.id}`,
          subtitle: `${a.tracks_count ?? 0} clips`,
        }))}
        selectedIds={new Set(favorites.artists)}
        onPickToggle={(id) => {
          if (favorites.artists.includes(id)) return safeRemoveFavorite('artist', id);
          return safeAddFavorite('artist', id);
        }}
        searchPlaceholder="Search artists…"
        isOnline={isOnline}
      />

      <Section
        title="Question types"
        items={favorites.questionTypes}
        renderName={(slug) => typeBySlug.get(slug) ?? slug}
        onRemove={(slug) => safeRemoveFavorite('question-type', slug)}
        pickerItems={QUESTION_TYPES.map((t) => ({
          id: t.value,
          label: t.label,
        }))}
        selectedIds={new Set(favorites.questionTypes)}
        onPickToggle={(slug) => {
          if (favorites.questionTypes.includes(slug)) return safeRemoveFavorite('question-type', slug);
          return safeAddFavorite('question-type', slug);
        }}
        searchable={false}
        isOnline={isOnline}
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
  isOnline = true, // ✅ Accept online status
}) {
  const [adding, setAdding] = useState(false);

  // ✅ Auto-close picker if connection drops while open
  useEffect(() => {
    if (!isOnline && adding) setAdding(false);
  }, [isOnline, adding]);

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
          onClick={() => isOnline && setAdding((v) => !v)}
          disabled={!isOnline}
          className={`text-xs transition-colors ${
            isOnline 
              ? 'text-ink-muted hover:text-ink' 
              : 'text-ink-subtle cursor-not-allowed opacity-50'
          }`}
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
              className={`
                inline-flex items-center gap-2
                px-3 h-8 rounded-md
                border border-border bg-surface-2
                text-xs text-ink
                ${!isOnline ? 'opacity-70' : ''}
              `}
            >
              <span className="truncate max-w-[12rem]">{renderName(id)}</span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                disabled={!isOnline}
                className={`transition-colors ${
                  isOnline 
                    ? 'text-ink-subtle hover:text-wrong' 
                    : 'text-ink-subtle/50 cursor-not-allowed'
                }`}
                aria-label={`Remove ${renderName(id)}`}
              >
                <IconClose/>
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
          disabled={!isOnline} 
        />
      )}
    </section>
  );
}