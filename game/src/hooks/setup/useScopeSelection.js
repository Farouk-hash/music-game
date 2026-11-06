// game/src/hooks/setup/useScopeSelection.js
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useArtistRestrictions } from './useArtistRestrictions.js';

export function useScopeSelection({
  genres = [],
  artists = [],
  years = [],
  favorites = null,
  onFavoritesApplied = null,
  // --- Controlled Mode (for EditorScope) ---
  value, // { genreMode, selectedGenres, selectedArtists, selectedYears, artistQuery }
  onChange, // (partialState) => void
}) {
  const isControlled = !!value;

  // Local state (used if uncontrolled)
  const [localGenreMode, setLocalGenreMode] = useState('idle');
  const [localSelectedGenres,  setLocalSelectedGenres]  = useState(() => new Set());
  const [localSelectedArtists, setLocalSelectedArtists] = useState(() => new Set());
  const [localSelectedYears,   setLocalSelectedYears]   = useState(() => new Set());
  const [localArtistQuery, setLocalArtistQuery] = useState('');

  // Derive the "active" state (from props if controlled, local otherwise)
  const genreMode = isControlled ? value.genreMode : localGenreMode;
  const selectedGenres = isControlled ? value.selectedGenres : localSelectedGenres;
  const selectedArtists = isControlled ? value.selectedArtists : localSelectedArtists;
  const selectedYears = isControlled ? value.selectedYears : localSelectedYears;
  const artistQuery = isControlled ? value.artistQuery : localArtistQuery;

  // Unified setters
  const setGenreMode = useCallback((val) => {
    if (isControlled) onChange({ genreMode: val });
    else setLocalGenreMode(val);
  }, [isControlled, onChange]);

  const setSelectedGenres = useCallback((val) => {
    if (isControlled) onChange({ selectedGenres: val });
    else setLocalSelectedGenres(val);
  }, [isControlled, onChange]);

  const setSelectedArtists = useCallback((val) => {
    if (isControlled) onChange({ selectedArtists: val });
    else setLocalSelectedArtists(val);
  }, [isControlled, onChange]);

  const setSelectedYears = useCallback((val) => {
    if (isControlled) onChange({ selectedYears: val });
    else setLocalSelectedYears(val);
  }, [isControlled, onChange]);

  const setArtistQuery = useCallback((val) => {
    if (isControlled) onChange({ artistQuery: val });
    else setLocalArtistQuery(val);
  }, [isControlled, onChange]);

  // ── Restrictions ──
  const {
    strictGenres, setStrictGenres,
    strictYears,  setStrictYears,
    matchesGenres,
    matchesYears: artistMatchesYears,
    validYears: computeValidYears,
    reconcileArtists,
  } = useArtistRestrictions({ genres, artists, years, storageKeyPrefix: 'game' });

  // ── Auto-preselect favourites ──
  const preselectedRef = useRef(false);
  useEffect(() => {
    if (isControlled) return; // Skip favourites in controlled mode
    if (preselectedRef.current) return;
    if (!favorites) return;
    
    const hasAny = favorites.genres?.length > 0 || favorites.artists?.length > 0;
    if (!hasAny) return;

    preselectedRef.current = true;

    if (favorites.genres?.length > 0) {
      setSelectedGenres(new Set(favorites.genres));
      setGenreMode('some');
    }
    if (favorites.artists?.length > 0) {
      setSelectedArtists(new Set(favorites.artists));
    }
    
    onFavoritesApplied?.(favorites);
  }, [favorites, onFavoritesApplied, isControlled, setSelectedGenres, setSelectedArtists, setGenreMode]);

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
  }, [setSelectedGenres, setGenreMode, setSelectedArtists, setSelectedYears, setArtistQuery]);

  const chooseAllGenres = useCallback(() => {
    setSelectedGenres(new Set());
    setGenreMode((m) => (m === 'all' ? 'idle' : 'all'));
    setSelectedArtists(new Set());
    setSelectedYears(new Set());
    setArtistQuery('');
  }, [setSelectedGenres, setGenreMode, setSelectedArtists, setSelectedYears, setArtistQuery]);

  const toggleStrictGenres = useCallback((next) => {
    setStrictGenres(next);
    if (next) {
      setSelectedArtists(prev =>
        reconcileArtists(prev, { genreIdsSet: selectedGenres, yearSet: selectedYears })
      );
    }
  }, [setStrictGenres, reconcileArtists, selectedGenres, selectedYears, setSelectedArtists]);

  const toggleArtist = useCallback((id) => {
    setSelectedArtists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedArtists]);

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
    setArtistQuery('');
  }, [strictYears, selectedYears, artistMatchesYears, setSelectedGenres, setGenreMode, setSelectedArtists, setArtistQuery]);

  const toggleYear = useCallback((year) => {
    const nextYears = new Set(selectedYears);
    if (nextYears.has(year)) nextYears.delete(year);
    else nextYears.add(year);
    setSelectedYears(nextYears);
    if (strictYears && nextYears.size > 0) {
      setSelectedArtists(prev =>
        reconcileArtists(prev, { genreIdsSet: selectedGenres, yearSet: nextYears })
      );
    }
  }, [selectedYears, selectedGenres, strictYears, reconcileArtists, setSelectedYears, setSelectedArtists]);

  const toggleStrictMode = useCallback((next) => {
    setStrictYears(next);
    if (next && selectedYears.size > 0) {
      setSelectedArtists(prev =>
        reconcileArtists(prev, { genreIdsSet: selectedGenres, yearSet: selectedYears })
      );
    }
  }, [setStrictYears, reconcileArtists, selectedGenres, selectedYears, setSelectedArtists]);

  const applyYearRange = useCallback((yearsToSelect) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      for (const y of yearsToSelect) next.add(y);
      return next;
    });
  }, [setSelectedYears]);

  const randomizeSelection = useCallback(() => {
    if (!genres || !artists) return;
    const numGenres = Math.floor(Math.random() * 3) + 1;
    const shuffledGenres = [...genres].sort(() => 0.5 - Math.random());
    const pickedGenres = shuffledGenres.slice(0, numGenres);

    setGenreMode('some');
    setSelectedGenres(new Set(pickedGenres.map(g => g.id)));

    const validArtists = artists.filter(a =>
      pickedGenres.some(g => a.genre_ids?.includes(g.id))
    );
    const maxArtists = Math.min(8, validArtists.length);
    const numArtists = Math.max(1, Math.floor(Math.random() * (maxArtists - 2 + 1)) + 2);
    const shuffledArtists = [...validArtists].sort(() => 0.5 - Math.random());
    const pickedArtists = shuffledArtists.slice(0, numArtists);
    setSelectedArtists(new Set(pickedArtists.map(a => a.id)));

    setSelectedYears(new Set());
    setArtistQuery('');
  }, [genres, artists, setGenreMode, setSelectedGenres, setSelectedArtists, setSelectedYears, setArtistQuery]);

  const handleGenreUnfavorited = useCallback((id) => {
    setSelectedGenres((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      if (next.size === 0) setGenreMode('idle');
      return next;
    });
  }, [setSelectedGenres, setGenreMode]);

  const handleArtistUnfavorited = useCallback((id) => {
    setSelectedArtists((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [setSelectedArtists]);

  // ── Derived State ──
  const showArtists = genreMode !== 'idle';

  const genreFilteredArtists = useMemo(() => {
    if (genreMode === 'all') return artists;
    if (genreMode === 'some') return artists.filter((a) => matchesGenres(a, selectedGenres));
    return [];
  }, [genreMode, artists, selectedGenres, matchesGenres]);

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
    const valid = computeValidYears(years, validArtistIds);
    return new Set([...selectedYears].filter((y) => valid.has(y)));
  }, [selectedYears, years, validArtistIds, computeValidYears]);

  const allVisibleSelected =
    visibleArtists.length > 0 &&
    visibleArtists.every((a) => effectiveSelectedArtists.has(a.id));

  const toggleSelectAllArtists = useCallback(() => {
    if (allVisibleSelected) setSelectedArtists(new Set());
    else setSelectedArtists(new Set(visibleArtists.map((a) => a.id)));
  }, [allVisibleSelected, visibleArtists, setSelectedArtists]);

  const canStart = genreMode !== 'idle';

  return {
    // State
    genreMode, setGenreMode,
    selectedGenres,
    selectedArtists,
    selectedYears,
    artistQuery, setArtistQuery,
    
    // Derived Lists
    showArtists,
    visibleArtists,
    effectiveSelectedArtists,
    validArtistIds,
    effectiveSelectedYears,
    allVisibleSelected,
    canStart,

    // Strict Toggles
    strictGenres, toggleStrictGenres,
    strictYears, toggleStrictMode,

    // Handlers
    toggleGenre,
    chooseAllGenres,
    toggleArtist,
    pickArtistFromSearch,
    toggleYear,
    applyYearRange,
    randomizeSelection,
    toggleSelectAllArtists,
    handleGenreUnfavorited,
    handleArtistUnfavorited,
  };
}