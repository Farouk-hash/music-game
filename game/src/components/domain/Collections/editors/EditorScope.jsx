// game/src/components/domain/Collections/editor/EditorScope.jsx
import { useMemo, useState, useCallback } from 'react';
import { useCatalog } from '@/hooks/setup/useCatalog.js';
import { GenreTileGrid } from '../../Setup/Genres/GenreTileGrid.jsx';
import { StrictGenreToggle } from '../../Setup/Genres/StrictGenreToggle.jsx';
import { ArtistTileGrid } from '../../Setup/Artists/ArtistTileGrid.jsx';
import { YearTileGrid } from '../../Setup/Years/YearTileGrid.jsx';
import { StrictModeToggle } from '../../Setup/Years/StrictModeToggle.jsx';
import { YearRangeModal } from '../../Setup/Years/YearRangeModal.jsx';
import { SearchBar } from '@/components/ui/SearchBar.jsx';
import { IconCalendar, IconX, IconGenres, IconArtists } from '@/icons';
import { CollapsibleSection } from '@/components/layout/CollapsibleSection.jsx';
import { useScopeSelection } from '@/hooks/setup/useScopeSelection.js';

export function EditorScope({ draft, toggleGenre, toggleArtist, toggleYear, readOnly = false }) {
  const { data } = useCatalog();
  const [yearRangeOpen, setYearRangeOpen] = useState(false);

  const [genresOpen, setGenresOpen] = useState(true);
  const [artistsOpen, setArtistsOpen] = useState(true);
  const [yearsOpen, setYearsOpen] = useState(true);

  // NEW: lift artist query into local state
  const [artistQuery, setArtistQuery] = useState('');

  const genres  = data?.genres  ?? [];
  const artists = data?.artists ?? [];
  const years   = data?.years   ?? [];

  const yearSet = draft.years?.type === 'set' ? new Set(draft.years.values) : new Set();

  const scopeValue = useMemo(() => ({
    genreMode: draft.genresIds.size > 0 ? 'some' : 'idle',
    selectedGenres: draft.genresIds,
    selectedArtists: draft.artistsIds,
    selectedYears: yearSet,
    artistQuery,  // <-- use the lifted state
  }), [draft.genresIds, draft.artistsIds, yearSet, artistQuery]);

  const handleScopeChange = useCallback((changes) => {
    if (changes.selectedGenres) {
      const next = changes.selectedGenres;
      for (const id of draft.genresIds) if (!next.has(id)) toggleGenre(id);
      for (const id of next) if (!draft.genresIds.has(id)) toggleGenre(id);
    }
    if (changes.selectedArtists) {
      const next = changes.selectedArtists;
      for (const id of draft.artistsIds) if (!next.has(id)) toggleArtist(id);
      for (const id of next) if (!draft.artistsIds.has(id)) toggleArtist(id);
    }
    if (changes.selectedYears) {
      const next = changes.selectedYears;
      for (const y of yearSet) if (!next.has(y)) toggleYear(y);
      for (const y of next) if (!yearSet.has(y)) toggleYear(y);
    }
    // NEW: handle artist query changes
    if (changes.artistQuery !== undefined) {
      setArtistQuery(changes.artistQuery);
    }
  }, [draft.genresIds, draft.artistsIds, yearSet, toggleGenre, toggleArtist, toggleYear]);

  const {
    visibleArtists,
    yearFilteredArtists,
    validArtistIds,
    strictGenres,
    strictYears,
    // `artistQuery` and `setArtistQuery` from the hook are still
    // available but we no longer use them — we use our local ones.
    toggleStrictGenres,
    toggleStrictMode,
    applyYearRange,
  } = useScopeSelection({
    genres, artists, years,
    value: scopeValue,
    onChange: handleScopeChange,
  });

  // ── READ-ONLY FILTERS ──
  const genresToDisplay = readOnly ? genres.filter(g => draft.genresIds.has(g.id)) : genres;
  const yearsToDisplay = readOnly ? years.filter(y => yearSet.has(y.year)) : years;
  const showYears = readOnly ? yearsToDisplay.length > 0 : years.length > 0;

  // ── ARTIST SORTING & LABELS ──
  // 1. Sort selected artists to the front
  const sortedArtists = useMemo(() => {
    if (!visibleArtists || visibleArtists.length === 0) return [];
    if (!draft.artistsIds || draft.artistsIds.size === 0) return visibleArtists;

    const selected = [];
    const unselected = [];
    for (const a of visibleArtists) {
      if (draft.artistsIds.has(a.id)) selected.push(a);
      else unselected.push(a);
    }
    return [...selected, ...unselected];
  }, [visibleArtists, draft.artistsIds]);

  // 2. Determine if we should show the "All Artists" label
  const showAllArtistsLabel = readOnly && draft.genresIds.size > 0 && draft.artistsIds.size === 0;

  const handleApplyYearRange = useCallback((yearsToAdd) => {
    applyYearRange(yearsToAdd);
  }, [applyYearRange]);

  const handleClearYears = useCallback(() => {
    for (const y of yearSet) toggleYear(y);
  }, [yearSet, toggleYear]);
  
  return (
    <div className="space-y-4">
      <CollapsibleSection
        open={genresOpen}
        onToggle={() => setGenresOpen(o => !o)}
        title="Genres"
        icon={<IconGenres className="w-5 h-5" />}
        meta={readOnly ? (genresToDisplay.length > 0 ? `(${genresToDisplay.length})` : null) : (draft.genresIds.size > 0 ? `(${draft.genresIds.size})` : null)}
        secondaryActions={
          !readOnly && (
            <StrictGenreToggle
              value={strictGenres}
              onChange={toggleStrictGenres}
              disabled={draft.genresIds.size < 2}
            />
          )
        }
      >
        {readOnly && genresToDisplay.length === 0 ? (
          <p className="text-xs text-ink-subtle italic py-2">Any genre</p>
        ) : (
          <GenreTileGrid
            genres={genresToDisplay}
            selectedIds={draft.genresIds}
            onToggle={readOnly ? () => {} : toggleGenre}
            allSelected={false}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        open={artistsOpen}
        onToggle={() => setArtistsOpen(o => !o)}
        title="Artists"
        icon={<IconArtists className="w-5 h-5" />}
        meta={
          readOnly
            ? (draft.artistsIds.size > 0 ? `(${draft.artistsIds.size})` : null)
            : (draft.artistsIds.size > 0 ? `(${draft.artistsIds.size})` : null)
        }
      >
        {showAllArtistsLabel ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center bg-surface-2">
            <p className="text-sm font-medium text-ink">All Artists Selected</p>
            <p className="text-xs text-ink-subtle mt-1">No specific artists are filtered.</p>
          </div>
        ) : readOnly && visibleArtists.length === 0 ? (
          <p className="text-xs text-ink-subtle italic py-2">Any artist</p>
        ) : draft.genresIds.size === 0 && !readOnly ? (
          <p className="text-[11px] text-ink-subtle italic">No genre selected (all artists).</p>
        ) : (
          <div className="space-y-2">
            {!readOnly && (
              <>
                <SearchBar value={artistQuery} onChange={setArtistQuery} placeholder="Filter artists…" />
                {artistQuery && (
                  <p className="text-[11px] text-ink-subtle">{visibleArtists.length} of {yearFilteredArtists.length} match</p>
                )}
              </>
            )}
            {visibleArtists.length === 0 ? (
              <p className="text-xs text-ink-subtle text-center py-4 border border-dashed border-border rounded-md">
                No artists match the current filters.
              </p>
            ) : (
              <ArtistTileGrid
                artists={sortedArtists}
                selectedIds={draft.artistsIds}
                onToggle={readOnly ? () => {} : toggleArtist}
              />
            )}
          </div>
        )}
      </CollapsibleSection>

      {showYears && (
        <CollapsibleSection
          open={yearsOpen}
          onToggle={() => setYearsOpen(o => !o)}
          title="Release years"
          icon={<IconCalendar className="w-5 h-5" />}
          meta={
            readOnly
              ? (yearsToDisplay.length > 0 ? `(${yearsToDisplay.length})` : null)
              : (draft.years ? `(${draft.years.type === 'range' ? draft.years.values : `${draft.years.values.length}`})` : null)
          }
          secondaryActions={
            !readOnly && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setYearRangeOpen(true)} className="inline-flex items-center justify-center gap-2 px-3 h-9 rounded-md border text-sm transition-colors shrink-0 bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink" title="Select Range">
                  <IconCalendar className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Range</span>
                </button>
                <StrictModeToggle value={strictYears} onChange={toggleStrictMode} disabled={yearSet.size === 0} />
                {yearSet.size > 0 && (
                  <button type="button" onClick={handleClearYears} className="inline-flex items-center justify-center px-3 h-9 rounded-md border text-sm transition-colors shrink-0 bg-surface-2 text-wrong border-border hover:border-wrong" title="Clear all">
                    <IconX className="w-4 h-4 shrink-0" />
                  </button>
                )}
              </div>
            )
          }
        >
          {readOnly && yearsToDisplay.length === 0 ? (
            <p className="text-xs text-ink-subtle italic py-2">Any year</p>
          ) : (
            <div className="space-y-2">
              {!readOnly && (
                <p className="text-[11px] text-ink-subtle">
                  Optional. Leave blank to include every year.
                </p>
              )}
              <YearTileGrid
                years={yearsToDisplay}
                validArtistIds={validArtistIds}
                selectedYears={yearSet}
                onToggle={readOnly ? () => {} : toggleYear}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {!readOnly && showYears && (
        <YearRangeModal
          open={yearRangeOpen}
          onClose={() => setYearRangeOpen(false)}
          years={years}
          onApply={handleApplyYearRange}
        />
      )}

    </div>
  );
}