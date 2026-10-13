// game/src/hooks/setup/useFavoriteToggles.js
import { useCallback, useMemo } from 'react';
import { useProfileContext } from '../../context/ProfileContext.jsx';

/**
 * Convenience wrapper around ProfileContext for Setup-screen tiles.
 */
export function useFavoriteToggles() {
  const { favorites, addFavorite, removeFavorite } = useProfileContext();

  const artistSet = useMemo(() => new Set(favorites.artists),       [favorites.artists]);
  const genreSet  = useMemo(() => new Set(favorites.genres),        [favorites.genres]);
  const trackSet  = useMemo(() => new Set(favorites.tracks),        [favorites.tracks]);
  const typeSet   = useMemo(() => new Set(favorites.questionTypes), [favorites.questionTypes]);

  const makeToggle = useCallback((kind, set) => (value) => {
    if (set.has(value)) return removeFavorite(kind, value);
    return addFavorite(kind, value);
  }, [addFavorite, removeFavorite]);

  return {
    isArtistFavorite:       (id)   => artistSet.has(id),
    isGenreFavorite:        (id)   => genreSet.has(id),
    isTrackFavorite:        (id)   => trackSet.has(id),
    isQuestionTypeFavorite: (slug) => typeSet.has(slug),

    toggleArtist:       makeToggle('artist',        artistSet),
    toggleGenre:        makeToggle('genre',         genreSet),
    toggleTrack:        makeToggle('track',         trackSet),
    toggleQuestionType: makeToggle('question-type', typeSet),
  };
}