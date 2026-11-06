// game/src/hooks/collections/useCollectionFilters.js
import { useMemo } from 'react';

/**
 * Extracts facets from a list of collections.
 * A collection "has" a facet value if ANY of its rounds use it.
 */
export function useCollectionFilters(collections, { query, activeFilters }) {
  // 1. Apply Search (name match)
  const searched = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => (c.name ?? '').toLowerCase().includes(q));
  }, [collections, query]);

  // 2. Extract Facets from searched list
  const facets = useMemo(() => {
    const f = {
      genres: new Map(),
      artists: new Map(),
      questionTypes: new Map(),
      levels: new Map(),
      modes: new Map(),
      instruments: new Map(),
      friends: new Map(), // <-- NEW
    };

    const add = (map, key) => {
      if (key == null) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    };

    for (const c of searched) {
      // Scope (collection level)
      (c.genresIds ?? []).forEach(id => add(f.genres, id));
      (c.artistsIds ?? []).forEach(id => add(f.artists, id));
      (c.levels ?? []).forEach(l => add(f.levels, l));

      // NEW: Track if the collection author is a friend
      if (c.followStatus === 'friends') {
        add(f.friends, 'true');
      }

      // Config (round level) — dedupe per collection so a round with
      // "name-track" twice doesn't count the collection twice.
      const ct = new Set();
      const cm = new Set();
      const ci = new Set();
      
      for (const r of (c.rounds ?? [])) {
        (r.questionTypes ?? []).forEach(t => ct.add(t));
        if (r.mode) cm.add(r.mode);
        if (r.instruments) ci.add(r.instruments);
      }
      
      ct.forEach(t => add(f.questionTypes, t));
      cm.forEach(m => add(f.modes, m));
      ci.forEach(i => add(f.instruments, i));
    }

    return f;
  }, [searched]);

  // 3. Apply Active Filters (AND across groups, OR within group)
  const filtered = useMemo(() => {
    return searched.filter((c) => {
      // Genres
      if (activeFilters.genres?.size > 0) {
        const has = (c.genresIds ?? []).some(id => activeFilters.genres.has(id));
        if (!has) return false;
      }
      // Artists
      if (activeFilters.artists?.size > 0) {
        const has = (c.artistsIds ?? []).some(id => activeFilters.artists.has(id));
        if (!has) return false;
      }
      // Levels
      if (activeFilters.levels?.size > 0) {
        const has = (c.levels ?? []).some(l => activeFilters.levels.has(l));
        if (!has) return false;
      }

      // NEW: Friends
      if (activeFilters.friends?.size > 0) {
        if (c.followStatus !== 'friends') return false;
      }

      // Round-level checks
      const rounds = c.rounds ?? [];
      
      if (activeFilters.questionTypes?.size > 0) {
        const has = rounds.some(r => (r.questionTypes ?? []).some(t => activeFilters.questionTypes.has(t)));
        if (!has) return false;
      }
      if (activeFilters.modes?.size > 0) {
        const has = rounds.some(r => activeFilters.modes.has(r.mode));
        if (!has) return false;
      }
      if (activeFilters.instruments?.size > 0) {
        const has = rounds.some(r => activeFilters.instruments.has(r.instruments));
        if (!has) return false;
      }

      return true;
    });
  }, [searched, activeFilters]);

  return { searched, filtered, facets };
}