// game/src/hooks/setup/useArtistRestrictions.js
//
// Centralized artist-restriction logic used by Setup and the collection editor.
//
// Two "strict" toggles (persisted in localStorage, per prefix):
//   - strictGenres: when on, an artist must have ALL selected genres
//                   (intersection). When off, ANY selected genre matches.
//   - strictYears:  when on, an artist must have at least one album
//                   in the selected years.
//
// Also derives:
//   - which years are relevant given the current artist scope
//   - which selected artists should be kept when scope changes

import { useState, useMemo, useCallback } from 'react';

export function useArtistRestrictions({
  genres = [],
  artists = [],
  years = [],
  storageKeyPrefix = 'game',
} = {}) {
  const strictGenresKey = `${storageKeyPrefix}.strictGenres`;
  const strictYearsKey = `${storageKeyPrefix}.strictYears`;

  const [strictGenres, setStrictGenresState] = useState(() =>
    localStorage.getItem(strictGenresKey) === '1'
  );
  const [strictYears, setStrictYearsState] = useState(() =>
    localStorage.getItem(strictYearsKey) === '1'
  );

  const setStrictGenres = useCallback((next) => {
    setStrictGenresState(next);
    localStorage.setItem(strictGenresKey, next ? '1' : '0');
  }, [strictGenresKey]);

  const setStrictYears = useCallback((next) => {
    setStrictYearsState(next);
    localStorage.setItem(strictYearsKey, next ? '1' : '0');
  }, [strictYearsKey]);

  // Map artist.id -> Set<year>
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

  const matchesGenres = useCallback((artist, genreIdsSet) => {
    if (!genreIdsSet || genreIdsSet.size === 0) return true;
    const ids = Array.isArray(artist.genre_ids) ? artist.genre_ids : [];
    if (ids.length === 0) return false;
    if (strictGenres) {
      for (const g of genreIdsSet) if (!ids.includes(g)) return false;
      return true;
    }
    for (const g of genreIdsSet) if (ids.includes(g)) return true;
    return false;
  }, [strictGenres]);

  const matchesYears = useCallback((artistId, yearSet) => {
    if (!yearSet || yearSet.size === 0) return true;
    const ys = artistYears.get(artistId);
    if (!ys || ys.size === 0) return false;
    for (const y of yearSet) if (ys.has(y)) return true;
    return false;
  }, [artistYears]);

  const validYears = useCallback((allYears, validArtistIds) => {
    const s = new Set();
    for (const { year, artist_ids } of allYears) {
      if (artist_ids.some((id) => validArtistIds.has(id))) s.add(year);
    }
    return s;
  }, []);

  const reconcileArtists = useCallback((prevArtists, { genreIdsSet, yearSet }) => {
    if (!strictGenres && !strictYears) return prevArtists;
    const next = new Set();
    for (const id of prevArtists) {
      const a = artists.find((x) => x.id === id);
      if (!a) continue;
      if (matchesGenres(a, genreIdsSet) && (!strictYears || matchesYears(id, yearSet))) {
        next.add(id);
      }
    }
    return next.size === prevArtists.size ? prevArtists : next;
  }, [artists, matchesGenres, matchesYears, strictGenres, strictYears]);

  return {
    strictGenres, setStrictGenres,
    strictYears, setStrictYears,
    matchesGenres,
    matchesYears,
    validYears,
    reconcileArtists,
  };
}