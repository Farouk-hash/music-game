// game/src/hooks/ui/useMediaQuery.js
import { useState, useEffect } from 'react';

/**
 * Returns true if the viewport matches a CSS media query.
 * Safe under SSR (returns false until mounted).
 *
 *   const isDesktop = useMediaQuery('(min-width: 640px)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}