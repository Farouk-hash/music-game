// game/src/routes/Setup.jsx
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '@/hooks/setup/useCatalog.js';
import { useGameSettings } from '@/context/GameSettingsContext.jsx';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { useScopeSelection } from '@/hooks/setup/useScopeSelection.js';
import { GenreTileGrid } from '@/components/domain/Setup/Genres/GenreTileGrid.jsx';
import { StrictGenreToggle } from '@/components/domain/Setup/Genres/StrictGenreToggle.jsx';
import { SelectionBar } from '@/components/domain/SelectionBar.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { CollapsibleSection } from '@/components/layout/CollapsibleSection.jsx';
import { SearchBar } from '@/components/ui/SearchBar.jsx';
import { SetupArtistSearch } from '@/components/domain/Setup/Artists/SetupArtistSearch.jsx';
import { SkeletonTileGrid } from '@/components/domain/Tile/SkeletonTileGrid.jsx';
import { ArtistTileGrid } from '@/components/domain/Setup/Artists/ArtistTileGrid.jsx';
import { YearTileGrid } from '@/components/domain/Setup/Years/YearTileGrid.jsx';
import { StrictModeToggle } from '@/components/domain/Setup/Years/StrictModeToggle.jsx';
import { Level1Modal } from '@/components/domain/Setup/Modals/Level1Modal.jsx';
import { Level2Modal } from '@/components/domain/Setup/Modals/Level2Modal.jsx';
import { Level3Modal } from '@/components/domain/Setup/Modals/Level3Modal.jsx';
import { MultiplayerModal } from '@/components/domain/Multiplayer/MultiplayerModal.jsx';
import { SporcleModal } from '@/components/domain/Setup/Modals/SporcleModal.jsx';
import { ViewToggle } from '@/components/ui/ViewToggle.jsx';
import { YearRangeModal } from '@/components/domain/Setup/Years/YearRangeModal.jsx';
import { IconSelectAll, IconGenres, IconCalendar, IconX, IconArtists, IconDice } from '@/icons';
import { SetupHeader } from '@/components/domain/Setup/SetupHeader';

export default function Setup() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCatalog();
  const settings = useGameSettings();
  const { favorites } = useProfileContext();

  const reversedClipsCount = data?.counts?.reversedClips ?? 0;
  const genres  = data?.genres  ?? [];
  const artists = data?.artists ?? [];
  const years   = data?.years   ?? [];

  const scope = useScopeSelection({
    genres,
    artists,
    years,
    favorites,
    onFavoritesApplied: (favs) => {
      if (favs.questionTypes?.length > 0) {
        const current = settings.questionTypes ?? [];
        const union = Array.from(new Set([...current, ...favs.questionTypes]));
        settings.setQuestionTypes(union);
      }
    }
  });

  // ── UI State ──
  const [genresOpen,  setGenresOpen]  = useState(true);
  const [artistsOpen, setArtistsOpen] = useState(true);
  const [yearsOpen,   setYearsOpen]   = useState(true);
  const [yearRangeOpen, setYearRangeOpen] = useState(false);
  const [query, setQuery] = useState('');

  const [genresView, setGenresView] = useState(() => {
    const v = localStorage.getItem('game.genresView');
    return v === 'list' || v === 'dense' ? v : 'grid';
  });
  const [artistsView, setArtistsView] = useState(() => {
    const v = localStorage.getItem('game.artistsView');
    return v === 'list' || v === 'dense' ? v : 'grid';
  });

  const changeGenresView = useCallback((v) => {
    setGenresView(v);
    localStorage.setItem('game.genresView', v);
  }, []);
  const changeArtistsView = useCallback((v) => {
    setArtistsView(v);
    localStorage.setItem('game.artistsView', v);
  }, []);

  const [level1Open, setLevel1Open] = useState(false);
  const [level2Open, setLevel2Open] = useState(false);
  const [level3Open, setLevel3Open] = useState(false);
  const [multiOpen,  setMultiOpen]  = useState(false);
  const [sporcleOpen, setSporcleOpen] = useState(false);

  const disabledTypes = useMemo(() => {
    const s = new Set();
    if (scope.effectiveSelectedArtists.size === 1) {
      s.add('name-artist');
      s.add('lyrics-artist');
    }
    return s;
  }, [scope.effectiveSelectedArtists.size]);

  const effectiveQuestionTypes = useMemo(
    () => settings.questionTypes.filter(t => !disabledTypes.has(t)),
    [settings.questionTypes, disabledTypes]
  );

  const handleQuestionTypeUnfavorited = useCallback((slug) => {
    const current = settings.questionTypes ?? [];
    if (!current.includes(slug)) return;
    settings.setQuestionTypes(current.filter((t) => t !== slug));
  }, [settings]);

  function buildPayload() {
    return {
      genres: scope.genreMode === 'some' ? [...scope.selectedGenres] : [],
      artists: [...scope.effectiveSelectedArtists],
      years: [...scope.effectiveSelectedYears],
      types: effectiveQuestionTypes,
      rendition: settings.audioRendition === 'reverse' && reversedClipsCount > 0 ? 'reverse' : 'forward',
      instruments: settings.instruments,
      answerMode: settings.answerMode,
      timer: settings.timer,
      reversed: settings.reversedAnswers,
    };
  }

  function handlePlay(level) {
    const payload = buildPayload();
    payload.count = level === 'three' ? Math.min(settings.roundCount, 10) : settings.roundCount;

    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));

    const path = level === 'two' ? '/play-two' : level === 'three' ? '/play-three' : '/play';
    navigate(path);
  }

  function handleMultiplayerStart({ names, level, roundsPerPlayer }) {
    const payload = buildPayload();
    payload.players = names;
    payload.level = level;
    payload.roundsPerPlayer = roundsPerPlayer;

    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));
    navigate('/play-multi');
  }

  function buildScope() {
    const out = {};
    if (scope.genreMode === 'some' && scope.selectedGenres.size > 0) out.genres = [...scope.selectedGenres];
    if (scope.effectiveSelectedArtists.size > 0) out.artists = [...scope.effectiveSelectedArtists];
    if (scope.effectiveSelectedYears.size > 0) out.years = [...scope.effectiveSelectedYears];
    return out;
  }

  return (
    <div className="space-y-10 pb-32">
      <SetupHeader/>

      {isLoading && <SkeletonTileGrid count={6} />}

      {error && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          <p className="text-wrong font-medium">Failed to load catalogue</p>
          <p className="text-ink-muted mt-1">{error.message}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          <CollapsibleSection
            open={genresOpen}
            onToggle={() => setGenresOpen(o => !o)}
            title="Genres"
            icon={<IconGenres className="w-5 h-5" />}
            meta={scope.genreMode === 'some' ? `(${scope.selectedGenres.size})` : null}
            secondaryActions={
              <>
                <button
                  type="button"
                  onClick={scope.randomizeSelection}
                  aria-label="Randomize selection"
                  className="inline-flex items-center justify-center px-3 h-9 rounded-md border text-sm bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink"
                >
                  <IconDice className="w-4 h-4 shrink-0" />
                </button>
                <ViewToggle value={genresView} onChange={changeGenresView} />
                <StrictGenreToggle
                  value={scope.strictGenres}
                  onChange={scope.toggleStrictGenres}
                  disabled={scope.genreMode !== 'some' || scope.selectedGenres.size < 2}
                />
              </>
            }
            actions={
              <button
                type="button"
                onClick={scope.chooseAllGenres}
                aria-pressed={scope.genreMode === 'all'}
                className={[
                  'inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 h-9 rounded-md border text-sm',
                  scope.genreMode === 'all' ? 'bg-accent text-bg border-accent' : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
                ].join(' ')}
              >
                <IconSelectAll className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">All genres</span>
              </button>
            }
          >
            <GenreTileGrid
              genres={genres}
              selectedIds={scope.selectedGenres}
              onToggle={scope.toggleGenre}
              allSelected={scope.genreMode === 'all'}
              onUnfavorited={scope.handleGenreUnfavorited}
              view={genresView}
            />
          </CollapsibleSection>

          <BorderContainer border="all" className="p-8 space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Quick find</h2>
              <div className="relative">
                <SearchBar value={query} onChange={setQuery} placeholder="Search artists by name…" />
                <SetupArtistSearch query={query} artists={artists} onPick={scope.pickArtistFromSearch} />
              </div>
            </div>
          </BorderContainer>

          {scope.showArtists && (
            <CollapsibleSection
              open={yearsOpen}
              onToggle={() => setYearsOpen(o => !o)}
              title="Release years"
              icon={<IconCalendar className="w-5 h-5" />}
              meta={scope.effectiveSelectedYears.size > 0 ? `(${scope.effectiveSelectedYears.size})` : null}
              secondaryActions={
                <>
                  <button type="button" onClick={() => setYearRangeOpen(true)} className="inline-flex items-center gap-2 px-3 h-9 rounded-md border text-sm bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink">
                    <IconCalendar className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Range</span>
                  </button>
                  <StrictModeToggle value={scope.strictYears} onChange={scope.toggleStrictMode} disabled={scope.effectiveSelectedYears.size === 0} />
                  {scope.effectiveSelectedYears.size > 0 && (
                    <button type="button" onClick={() => scope.applyYearRange([])} className="inline-flex items-center px-3 h-9 rounded-md border text-sm bg-surface-2 text-wrong border-border hover:border-wrong">
                      <IconX className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </>
              }
            >
              <YearTileGrid
                years={years}
                validArtistIds={scope.validArtistIds}
                selectedYears={scope.effectiveSelectedYears}
                onToggle={scope.toggleYear}
              />
            </CollapsibleSection>
          )}

          {scope.showArtists ? (
            <CollapsibleSection
              open={artistsOpen}
              onToggle={() => setArtistsOpen(o => !o)}
              title="Artists"
              icon={<IconArtists className="w-5 h-5" />}
              secondaryActions={<ViewToggle value={artistsView} onChange={changeArtistsView} />}
              meta={scope.effectiveSelectedArtists.size > 0 ? `(${scope.effectiveSelectedArtists.size})` : null}
              actions={
                <button
                  type="button"
                  onClick={scope.toggleSelectAllArtists}
                  disabled={scope.visibleArtists.length === 0}
                  aria-pressed={scope.allVisibleSelected}
                  className={[
                    'inline-flex items-center gap-2 px-3 h-9 rounded-md border text-sm disabled:opacity-40',
                    scope.allVisibleSelected ? 'bg-accent text-bg border-accent' : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
                  ].join(' ')}
                >
                  <IconSelectAll className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{scope.allVisibleSelected ? 'Clear' : 'Select all'}</span>
                </button>
              }
            >
              <div className="space-y-1">
                <SearchBar value={scope.artistQuery} onChange={scope.setArtistQuery} placeholder="Filter artists…" />
              </div>
              {scope.visibleArtists.length === 0 ? (
                <p className="text-sm text-ink-subtle text-center py-6 border border-dashed border-border rounded-md">
                  No artists match the current filters.
                </p>
              ) : (
                <ArtistTileGrid
                  artists={scope.visibleArtists}
                  selectedIds={scope.effectiveSelectedArtists}
                  onToggle={scope.toggleArtist}
                  onUnfavorited={scope.handleArtistUnfavorited}
                  view={artistsView}
                />
              )}
            </CollapsibleSection>
          ) : (
            <BorderContainer border="all" className="p-8">
              <p className="text-sm text-ink-subtle text-center py-6 border border-dashed border-border rounded-md">
                Pick a genre — or choose "All genres" — to see the artists.
              </p>
            </BorderContainer>
          )}
        </>
      )}

      <SelectionBar
        count={scope.effectiveSelectedArtists.size > 0 ? scope.effectiveSelectedArtists.size : scope.selectedGenres.size}
        countLabel={scope.effectiveSelectedArtists.size > 0 ? 'artists selected' : 'genres selected'}
        hint={scope.genreMode === 'all' ? 'Playing across all genres.' : scope.genreMode === 'idle' ? 'Pick a genre to continue.' : 'Narrow further by picking artists, or continue with all of them.'}
        actions={[
          { key: 'sporcle', label: 'Sporcle', variant: 'secondary', onClick: () => setSporcleOpen(true), disabled: false },
          { key: 'multiplayer', label: 'Multiplayer', variant: 'secondary', onClick: () => setMultiOpen(true), disabled: !scope.canStart },
          { key: 'play-three', label: 'Play level 3', variant: 'ghost', onClick: () => setLevel3Open(true), disabled: !scope.canStart },
          { key: 'play-two', label: 'Play level 2', variant: 'ghost', onClick: () => setLevel2Open(true), disabled: !scope.canStart },
          { key: 'play-one', label: 'Play level 1', variant: 'primary', onClick: () => setLevel1Open(true), disabled: !scope.canStart },
        ]}
      />

      <Level1Modal open={level1Open} onClose={() => setLevel1Open(false)} onPlay={() => handlePlay('one')} disabledTypes={disabledTypes} reversedClipsCount={reversedClipsCount} onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited} />
      <Level2Modal open={level2Open} onClose={() => setLevel2Open(false)} onPlay={() => handlePlay('two')} disabledTypes={disabledTypes} reversedClipsCount={reversedClipsCount} onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited} />
      <Level3Modal open={level3Open} onClose={() => setLevel3Open(false)} onPlay={() => handlePlay('three')} disabledTypes={disabledTypes} reversedClipsCount={reversedClipsCount} genreMode={scope.genreMode} effectiveSelectedArtistsCount={scope.effectiveSelectedArtists.size} onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited} />
      <MultiplayerModal 
        open={multiOpen} 
        onClose={() => setMultiOpen(false)} 
        onStart={handleMultiplayerStart} 
        starting={false} 
        disabledTypes={disabledTypes} 
        reversedClipsCount={reversedClipsCount} 
      />
      <SporcleModal open={sporcleOpen} onClose={() => setSporcleOpen(false)} initialMode="host" scope={buildScope()} canHost={scope.canStart} disabledTypes={disabledTypes} reversedClipsCount={reversedClipsCount} />
      <YearRangeModal open={yearRangeOpen} onClose={() => setYearRangeOpen(false)} years={years} onApply={scope.applyYearRange} />
    </div>
  );
}