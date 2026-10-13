// game/src/routes/Setup.jsx
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../hooks/setup/useCatalog.js';
import { useGameSettings } from '../context/GameSettingsContext.jsx';
import { useProfileContext } from '../context/ProfileContext.jsx';
import { GenreTileGrid } from '../components/domain/Setup/Genres/GenreTileGrid.jsx';
import { StrictGenreToggle } from '../components/domain/Setup/Genres/StrictGenreToggle.jsx';
import { SelectionBar } from '../components/domain/SelectionBar.jsx';
import { BorderContainer } from '../components/layout/BorderContainer.jsx';
import { CollapsibleSection } from '../components/layout/CollapsibleSection.jsx';
import { SearchBar } from '../components/ui/SearchBar.jsx';
import { SetupArtistSearch } from '../components/domain/Setup/Artists/SetupArtistSearch.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SkeletonTileGrid } from '../components/domain/Tile/SkeletonTileGrid.jsx';
import { ArtistTileGrid } from '../components/domain/Setup/Artists/ArtistTileGrid.jsx';
import { YearTileGrid } from '../components/domain/Setup/Years/YearTileGrid.jsx';
import { StrictModeToggle } from '../components/domain/Setup/Years/StrictModeToggle.jsx';
import { Level1Modal } from '../components/domain/Setup/Modals/Level1Modal.jsx';
import { Level2Modal } from '../components/domain/Setup/Modals/Level2Modal.jsx';
import { Level3Modal } from '../components/domain/Setup/Modals/Level3Modal.jsx';
import { MultiplayerModal } from '../components/domain/Multiplayer/MultiplayerModal.jsx';
import { SporcleModal } from '../components/domain/Setup/Modals/SporcleModal.jsx';


function matchesGenres(artist, selectedGenresSet, strictGenre) {
  const ids = Array.isArray(artist.genre_ids) ? artist.genre_ids : [];
  if (ids.length === 0) return false;
  if (strictGenre) {
    for (const g of selectedGenresSet) {
      if (!ids.includes(g)) return false;
    }
    return true;
  }
  for (const g of selectedGenresSet) {
    if (ids.includes(g)) return true;
  }
  return false;
}

export default function Setup() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCatalog();
  const settings = useGameSettings();
  const { favorites } = useProfileContext();

  // Catalogue counts — used to gate the reverse-audio toggle.
  const reversedClipsCount = data?.counts?.reversedClips ?? 0;

  // ── Scope state ──
  const [genreMode, setGenreMode] = useState('idle');
  const [selectedGenres,  setSelectedGenres]  = useState(() => new Set());
  const [selectedArtists, setSelectedArtists] = useState(() => new Set());
  const [selectedYears,   setSelectedYears]   = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');

  const [genresOpen,  setGenresOpen]  = useState(true);
  const [artistsOpen, setArtistsOpen] = useState(true);
  const [yearsOpen,   setYearsOpen]   = useState(true);

  // ── Strict toggles ──
  const [strictYears,  setStrictYears]  = useState(() =>
    localStorage.getItem('game.strictYears') === '1'
  );
  const [strictGenres, setStrictGenres] = useState(() =>
    localStorage.getItem('game.strictGenres') === '1'
  );

  // ── Modal state ──
  const [level1Open, setLevel1Open] = useState(false);
  const [level2Open, setLevel2Open] = useState(false);
  const [level3Open, setLevel3Open] = useState(false);
  const [multiOpen,  setMultiOpen]  = useState(false);
  const [sporcleOpen, setSporcleOpen] = useState(false);

  const genres  = data?.genres  ?? [];
  const artists = data?.artists ?? [];
  const years   = data?.years   ?? [];

  // ── Auto-preselect favourites once per Setup mount ────────
  // Runs when the profile loads (or when favourites change for the
  // first time). Guarded by a ref so heart clicks in the profile
  // modal don't clobber the user's current Setup state.
  const preselectedRef = useRef(false);

  useEffect(() => {
    if (preselectedRef.current) return;
    if (!favorites) return;

    const hasAny =
      favorites.genres.length > 0 ||
      favorites.artists.length > 0 ||
      favorites.questionTypes.length > 0;

    if (!hasAny) return;

    preselectedRef.current = true;

    if (favorites.genres.length > 0) {
      setSelectedGenres(new Set(favorites.genres));
      setGenreMode('some');
    }
    if (favorites.artists.length > 0) {
      setSelectedArtists(new Set(favorites.artists));
    }
    if (favorites.questionTypes.length > 0) {
      const current = settings.questionTypes ?? [];
      const union = Array.from(new Set([...current, ...favorites.questionTypes]));
      settings.setQuestionTypes(union);
    }
  }, [favorites, settings]);

  // ── Deselect-on-unfavourite callbacks ─────────────────────
  // Called by the tile grids when a heart un-favourites an item.
  // Removal from the scope is the only side effect — the profile
  // favourite has already been updated by the heart handler itself.

  const handleGenreUnfavorited = useCallback((id) => {
    setSelectedGenres((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      if (next.size === 0) setGenreMode('idle');
      return next;
    });
  }, []);

  const handleArtistUnfavorited = useCallback((id) => {
    setSelectedArtists((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleQuestionTypeUnfavorited = useCallback((slug) => {
    const current = settings.questionTypes ?? [];
    if (!current.includes(slug)) return;
    settings.setQuestionTypes(current.filter((t) => t !== slug));
  }, [settings]);

  // ── Artist/year helpers ──
  const artistYears = useMemo(() => {
    const m = new Map();
    for (const { year, artist_ids } of years) {
      for (const id of artist_ids) {
        if (!m.has(id)) m.set(id, new Set());
        m.get(id).add(year);
      }
    }
    return m;
  }, [years]);

  const artistMatchesYears = useCallback((artistId, yearsSet) => {
    const ys = artistYears.get(artistId);
    if (!ys || ys.size === 0) return false;
    for (const y of yearsSet) {
      if (ys.has(y)) return true;
    }
    return false;
  }, [artistYears]);

  const reconcileArtists = useCallback((prevArtists, yearsSet, strictOn) => {
    if (!strictOn || yearsSet.size === 0) return prevArtists;
    const next = new Set();
    for (const id of prevArtists) {
      if (artistMatchesYears(id, yearsSet)) next.add(id);
    }
    return next.size === prevArtists.size ? prevArtists : next;
  }, [artistMatchesYears]);

  // ── Handlers ──
  const toggleGenre = useCallback((id) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setGenreMode(next.size > 0 ? 'some' : 'idle');
      return next;
    });
    setSelectedArtists(new Set());
    setSelectedYears(new Set());
    setArtistQuery('');
  }, []);

  const chooseAllGenres = useCallback(() => {
    setSelectedGenres(new Set());
    setGenreMode((m) => (m === 'all' ? 'idle' : 'all'));
    setSelectedArtists(new Set());
    setSelectedYears(new Set());
    setArtistQuery('');
  }, []);

  const toggleStrictGenres = useCallback((next) => {
    setStrictGenres(next);
    localStorage.setItem('game.strictGenres', next ? '1' : '0');
    if (next) {
      setSelectedArtists(prev => {
        const pruned = new Set();
        for (const id of prev) {
          const artist = artists.find(a => a.id === id);
          if (artist && matchesGenres(artist, selectedGenres, true)) pruned.add(id);
        }
        return pruned.size === prev.size ? prev : pruned;
      });
    }
  }, [artists, selectedGenres]);

  const toggleArtist = useCallback((id) => {
    setSelectedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pickArtistFromSearch = useCallback((artist) => {
    const genreIds = Array.isArray(artist.genre_ids) ? artist.genre_ids : [];
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      for (const g of genreIds) next.add(g);
      return next;
    });
    setGenreMode((m) => {
      if (m !== 'idle') return m;
      return genreIds.length > 0 ? 'some' : 'all';
    });
    setSelectedArtists((prev) => {
      if (strictYears && selectedYears.size > 0) {
        if (!artistMatchesYears(artist.id, selectedYears)) return prev;
      }
      const next = new Set(prev);
      next.add(artist.id);
      return next;
    });
    setQuery('');
  }, [strictYears, selectedYears, artistMatchesYears]);

  const toggleYear = useCallback((year) => {
    const nextYears = new Set(selectedYears);
    if (nextYears.has(year)) nextYears.delete(year);
    else nextYears.add(year);
    setSelectedYears(nextYears);
    if (strictYears && nextYears.size > 0) {
      setSelectedArtists(prev => reconcileArtists(prev, nextYears, true));
    }
  }, [selectedYears, strictYears, reconcileArtists]);

  const toggleStrictMode = useCallback((next) => {
    setStrictYears(next);
    localStorage.setItem('game.strictYears', next ? '1' : '0');
    if (next && selectedYears.size > 0) {
      setSelectedArtists(prev => reconcileArtists(prev, selectedYears, true));
    }
  }, [selectedYears, reconcileArtists]);

  // ── Derived ──
  const showArtists = genreMode !== 'idle';

  const genreFilteredArtists = useMemo(() => {
    if (genreMode === 'all') return artists;
    if (genreMode === 'some') return artists.filter((a) => matchesGenres(a, selectedGenres, strictGenres));
    return [];
  }, [genreMode, artists, selectedGenres, strictGenres]);

  const yearFilteredArtists = useMemo(() => {
    if (!strictYears || selectedYears.size === 0) return genreFilteredArtists;
    return genreFilteredArtists.filter((a) => artistMatchesYears(a.id, selectedYears));
  }, [genreFilteredArtists, strictYears, selectedYears, artistMatchesYears]);

  const visibleArtists = useMemo(() => {
    const q = artistQuery.trim().toLowerCase();
    if (!q) return yearFilteredArtists;
    return yearFilteredArtists.filter((a) => (a.name ?? '').toLowerCase().includes(q));
  }, [yearFilteredArtists, artistQuery]);

  const visibleArtistIds = useMemo(
    () => new Set(visibleArtists.map((a) => a.id)),
    [visibleArtists]
  );

  const effectiveSelectedArtists = useMemo(
    () => new Set([...selectedArtists].filter((id) => visibleArtistIds.has(id))),
    [selectedArtists, visibleArtistIds]
  );

  const validArtistIds = useMemo(() => {
    if (effectiveSelectedArtists.size > 0) return effectiveSelectedArtists;
    return new Set(yearFilteredArtists.map((a) => a.id));
  }, [effectiveSelectedArtists, yearFilteredArtists]);

  const effectiveSelectedYears = useMemo(() => {
    const valid = new Set();
    for (const { year, artist_ids } of years) {
      if (artist_ids.some((id) => validArtistIds.has(id))) valid.add(year);
    }
    return new Set([...selectedYears].filter((y) => valid.has(y)));
  }, [selectedYears, years, validArtistIds]);

  const allVisibleSelected =
    visibleArtists.length > 0 &&
    visibleArtists.every((a) => effectiveSelectedArtists.has(a.id));

  const toggleSelectAllArtists = useCallback(() => {
    if (allVisibleSelected) setSelectedArtists(new Set());
    else setSelectedArtists(new Set(visibleArtists.map((a) => a.id)));
  }, [allVisibleSelected, visibleArtists]);

  const canStart = genreMode !== 'idle';

  // ── Question type availability ──
  const disabledTypes = useMemo(() => {
    const s = new Set();
    if (effectiveSelectedArtists.size === 1) {
      s.add('name-artist');
      s.add('lyrics-artist');
    }
    return s;
  }, [effectiveSelectedArtists.size]);

  const effectiveQuestionTypes = useMemo(
    () => settings.questionTypes.filter(t => !disabledTypes.has(t)),
    [settings.questionTypes, disabledTypes]
  );

  const hasEffectiveTypes = effectiveQuestionTypes.length > 0;

  // ── URL builders ──
  function buildBaseParams() {
    const params = new URLSearchParams();
    if (genreMode === 'some' && selectedGenres.size > 0) {
      params.set('genres', [...selectedGenres].join(','));
    }
    if (effectiveSelectedArtists.size > 0) {
      params.set('artists', [...effectiveSelectedArtists].join(','));
    }
    if (effectiveSelectedYears.size > 0) {
      params.set('years', [...effectiveSelectedYears].sort((a, b) => a - b).join(','));
    }
    if (effectiveQuestionTypes.length > 0) {
      params.set('types', effectiveQuestionTypes.join(','));
    }
    if (settings.audioRendition === 'reverse' && reversedClipsCount > 0) {
      params.set('rendition', 'reverse');
    }
    if (settings.instruments && settings.instruments !== 'none') {
      params.set('instruments', settings.instruments);
    }
    params.set('answerMode', settings.answerMode);
    params.set('timer', settings.timer);
    params.set('reversed', settings.reversedAnswers);
    return params;
  }

  function handlePlay(level) {
    if (!hasEffectiveTypes) return;
    const params = buildBaseParams();
    const effectiveCount = level === 'three'
      ? Math.min(settings.roundCount, 10)
      : settings.roundCount;
    params.set('count', String(effectiveCount));

    const path =
      level === 'two'   ? '/play-two'   :
      level === 'three' ? '/play-three' :
      '/play';
    navigate(`${path}?${params.toString()}`);
  }

  function handleMultiplayerStart({ names, level, roundsPerPlayer }) {
    const params = buildBaseParams();
    params.set('players', names.join(','));
    params.set('level', String(level));
    params.set('count', String(roundsPerPlayer));
    navigate(`/play-multi?${params.toString()}`);
  }

  function buildScope() {
    const out = {};
    if (genreMode === 'some' && selectedGenres.size > 0) out.genres = [...selectedGenres];
    if (effectiveSelectedArtists.size > 0) out.artists = [...effectiveSelectedArtists];
    if (effectiveSelectedYears.size > 0) out.years = [...effectiveSelectedYears];
    return out;
  }

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <BorderContainer border="all" className="p-8 space-y-4">
        <header className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink leading-tight">
            What do you want to be asked about?
          </h1>
          <p className="text-ink-muted max-w-xl">
            Pick the genres you want to play — or choose all — then narrow down
            to specific artists if you like.
          </p>
        </header>
      </BorderContainer>

      {isLoading && (
        <BorderContainer border="all" className="p-8 space-y-4">
          <Skeleton className="h-4 w-20" />
          <SkeletonTileGrid count={6} />
        </BorderContainer>
      )}

      {error && (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          <p className="text-wrong font-medium">Failed to load catalogue</p>
          <p className="text-ink-muted mt-1">{error.message}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Genres */}
          <CollapsibleSection
  open={genresOpen}
  onToggle={() => setGenresOpen(o => !o)}
  title="Genres"
  meta={genreMode === 'some' ? `(${selectedGenres.size})` : null}
  secondaryActions={
    <StrictGenreToggle
      value={strictGenres}
      onChange={toggleStrictGenres}
      disabled={genreMode !== 'some' || selectedGenres.size < 2}
    />
  }
  actions={
    <button
        type="button"
        onClick={chooseAllGenres}
        aria-pressed={genreMode === 'all'}
        aria-label="All genres"
        title="All genres"
        className={[
          'inline-flex items-center gap-2 px-4 h-9 rounded-md border text-sm transition-colors',
          genreMode === 'all'
            ? 'bg-accent text-bg border-accent'
            : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
        ].join(' ')}
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">All genres</span>
      </button>
  }
>
            <GenreTileGrid
              genres={genres}
              selectedIds={selectedGenres}
              onToggle={toggleGenre}
              allSelected={genreMode === 'all'}
              onUnfavorited={handleGenreUnfavorited}
            />
          </CollapsibleSection>

          {/* Quick find */}
          <BorderContainer border="all" className="p-8 space-y-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Quick find
              </h2>
              <p className="text-sm text-ink-muted">
                Know who you're looking for? Search by artist name.
              </p>
              <div className="relative">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search artists by name…"
                />
                <SetupArtistSearch
                  query={query}
                  artists={artists}
                  onPick={pickArtistFromSearch}
                />
              </div>
            </div>
          </BorderContainer>

          {/* Release years */}
          {showArtists && (
            <CollapsibleSection
              open={yearsOpen}
              onToggle={() => setYearsOpen(o => !o)}
              title="Release years"
              meta={effectiveSelectedYears.size > 0 ? `(${effectiveSelectedYears.size})` : null}
              actions={
                <>
                  <StrictModeToggle
                    value={strictYears}
                    onChange={toggleStrictMode}
                    disabled={effectiveSelectedYears.size === 0}
                  />
                  {effectiveSelectedYears.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedYears(new Set())}
                      className="text-xs text-ink-muted hover:text-ink"
                    >
                      Clear
                    </button>
                  )}
                </>
              }
            >
              <p className="text-sm text-ink-muted">
                Optional. Leave blank to play every year.
                {strictYears && effectiveSelectedYears.size > 0 && (
                  <> Artists with no albums in the selected years are hidden.</>
                )}
              </p>
              <YearTileGrid
                years={years}
                validArtistIds={validArtistIds}
                selectedYears={effectiveSelectedYears}
                onToggle={toggleYear}
              />
            </CollapsibleSection>
          )}

         {/* Artists */}
{showArtists ? (
  <CollapsibleSection
    open={artistsOpen}
    onToggle={() => setArtistsOpen(o => !o)}
    title="Artists"
    meta={effectiveSelectedArtists.size > 0 ? `${effectiveSelectedArtists.size} selected` : null}
    actions={
      <button
        type="button"
        onClick={toggleSelectAllArtists}
        disabled={visibleArtists.length === 0}
        aria-pressed={allVisibleSelected}
        aria-label={allVisibleSelected ? 'Clear artists' : 'Select all artists'}
        title={allVisibleSelected ? 'Clear artists' : 'Select all artists'}
        className={[
          'inline-flex items-center gap-2 px-4 h-9 rounded-md border text-sm transition-colors',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          allVisibleSelected
            ? 'bg-accent text-bg border-accent'
            : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
        ].join(' ')}
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
          <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">
          {allVisibleSelected ? 'Clear artists' : 'Select all artists'}
        </span>
      </button>
    }
  >
    <div className="space-y-1">
      <SearchBar
        value={artistQuery}
        onChange={setArtistQuery}
        placeholder="Filter artists…"
      />
      {artistQuery && (
        <p className="text-xs text-ink-subtle">
          {visibleArtists.length} of {yearFilteredArtists.length} match
        </p>
      )}
    </div>

    {visibleArtists.length === 0 ? (
      <p className="text-sm text-ink-subtle text-center py-6 border border-dashed border-border rounded-md">
        {artistQuery
          ? `No artists match "${artistQuery}"`
          : strictGenres && selectedGenres.size >= 2
            ? 'No artists have all the selected genres. Try turning off strict genres.'
            : 'No artists match the current filters.'}
      </p>
    ) : (
      <ArtistTileGrid
        artists={visibleArtists}
        selectedIds={effectiveSelectedArtists}
        onToggle={toggleArtist}
        resetKey={`${genreMode}:${[...selectedGenres].sort().join(',')}`}
        onUnfavorited={handleArtistUnfavorited}
      />
    )}
  </CollapsibleSection>
) : (
  <BorderContainer border="all" className="p-8">
    <p className="text-sm text-ink-subtle text-center py-6 border border-dashed border-border rounded-md">
      Pick a genre — or choose “All genres” — to see the artists.
    </p>
  </BorderContainer>
)}
        </>
      )}

      {/* Selection bar */}
      <SelectionBar
        count={
          effectiveSelectedArtists.size > 0
            ? effectiveSelectedArtists.size
            : selectedGenres.size
        }
        countLabel={
          effectiveSelectedArtists.size > 0
            ? 'artists selected'
            : 'genres selected'
        }
        hint={
          genreMode === 'all'
            ? 'Playing across all genres.'
            : genreMode === 'idle'
            ? 'Pick a genre to continue.'
            : 'Narrow further by picking artists, or continue with all of them.'
        }
        actions={[
          {
            key: 'sporcle',
            label: 'Sporcle',
            variant: 'secondary',
            onClick: () => setSporcleOpen(true),
            disabled: false,
          },
          {
            key: 'multiplayer',
            label: 'Multiplayer',
            variant: 'secondary',
            onClick: () => setMultiOpen(true),
            disabled: !canStart,
          },
          {
            key: 'play-three',
            label: 'Play level 3',
            variant: 'ghost',
            onClick: () => setLevel3Open(true),
            disabled: !canStart,
          },
          {
            key: 'play-two',
            label: 'Play level 2',
            variant: 'ghost',
            onClick: () => setLevel2Open(true),
            disabled: !canStart,
          },
          {
            key: 'play-one',
            label: 'Play level 1',
            variant: 'primary',
            onClick: () => setLevel1Open(true),
            disabled: !canStart,
          },
        ]}
      />

      {/* Modals */}
      <Level1Modal
        open={level1Open}
        onClose={() => setLevel1Open(false)}
        onPlay={() => handlePlay('one')}
        disabledTypes={disabledTypes}
        reversedClipsCount={reversedClipsCount}
        onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited}
      />
      <Level2Modal
        open={level2Open}
        onClose={() => setLevel2Open(false)}
        onPlay={() => handlePlay('two')}
        disabledTypes={disabledTypes}
        reversedClipsCount={reversedClipsCount}
        onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited}
      />
      <Level3Modal
        open={level3Open}
        onClose={() => setLevel3Open(false)}
        onPlay={() => handlePlay('three')}
        disabledTypes={disabledTypes}
        reversedClipsCount={reversedClipsCount}
        genreMode={genreMode}
        effectiveSelectedArtistsCount={effectiveSelectedArtists.size}
        onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited}
      />
      <MultiplayerModal
        open={multiOpen}
        onClose={() => setMultiOpen(false)}
        onStart={handleMultiplayerStart}
        starting={false}
        disabledTypes={disabledTypes}
        reversedClipsCount={reversedClipsCount}
        onQuestionTypeUnfavorited={handleQuestionTypeUnfavorited}
      />
      <SporcleModal
        open={sporcleOpen}
        onClose={() => setSporcleOpen(false)}
        initialMode="host"
        scope={buildScope()}
        canHost={canStart}
        disabledTypes={disabledTypes}
        reversedClipsCount={reversedClipsCount}
      />
    </div>
  );
}