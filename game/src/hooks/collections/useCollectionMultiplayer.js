// game/src/hooks/collections/useCollectionMultiplayer.js
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSettings } from '@/context/GameSettingsContext.jsx';
import { useToast } from '@/hooks/ui/useToast.jsx';

export function useCollectionMultiplayer() {
  const navigate = useNavigate();
  const settings = useGameSettings();
  const { show } = useToast();

  const [multiplayerCollection, setMultiplayerCollection] = useState(null);

  // Opens the modal for a given collection. Seeds the shared settings
  // context with the collection's first-level round, so the modal's
  // settings UI reflects the collection defaults (user can still tweak).
  const openMultiplayerFor = useCallback((collection, { onCloseReadOnly } = {}) => {
    const rounds = Array.isArray(collection.rounds) ? collection.rounds : [];
    const levels = Array.isArray(collection.levels) ? collection.levels : [];

    // Prefer the round matching the smallest available level. Fall back
    // to any round if there's no level metadata.
    const firstLevel = levels.length > 0 ? [...levels].sort((a, b) => a - b)[0] : null;
    const seedRound = firstLevel != null
      ? rounds.find(r => Number(r.level) === Number(firstLevel))
      : rounds.find(() => true);

    if (seedRound) {
      settings.applySettings({
        questionTypes: seedRound.questionTypes || [],
        answerMode: seedRound.answerMode || 'choose',
        reversedAnswers: seedRound.reversedAnswers || 'no',
        timer: seedRound.timer ? 'on' : 'off',
        audioRendition: seedRound.reversedAudio ? 'reverse' : 'forward',
        instruments: seedRound.instruments || 'none',
        roundCount: seedRound.rounds || 10,
      });
    }

    if (onCloseReadOnly) onCloseReadOnly();
    setMultiplayerCollection(collection);
  }, [settings]);

  const closeMultiplayer = useCallback(() => {
    setMultiplayerCollection(null);
  }, []);

  const startMultiplayer = useCallback(({ names, level, roundsPerPlayer }) => {
    const col = multiplayerCollection;
    if (!col) {
      show({ message: 'Could not start: missing collection.' });
      return;
    }

    const levelsAvailable = Array.isArray(col.levels) ? col.levels : [];
    const effectiveLevel = levelsAvailable.includes(level) ? level : (levelsAvailable[0] ?? level);

    const rounds = Array.isArray(col.rounds) ? col.rounds : [];
    const targetRound = rounds.find(r => Number(r.level) === Number(effectiveLevel));

    if (!targetRound) {
      show({ message: `No round config found for Level ${effectiveLevel}.` });
      return;
    }

    const payload = {
      genres: col.genresIds || [],
      artists: col.artistsIds || [],
      years: col.years?.values || [],
      types: targetRound.questionTypes || [],
      answerMode: targetRound.answerMode || 'choose',
      timer: targetRound.timer ? 'on' : 'off',
      reversed: targetRound.reversedAnswers || 'no',
      instruments: targetRound.instruments || 'none',
      rendition: targetRound.reversedAudio ? 'reverse' : 'forward',
      count: targetRound.rounds || 10,
      players: names,
      level: effectiveLevel,
      roundsPerPlayer,
    };

    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));
    setMultiplayerCollection(null);
    navigate('/play-multi');
  }, [multiplayerCollection, navigate, show]);

  return {
    multiplayerCollection,
    openMultiplayerFor,
    closeMultiplayer,
    startMultiplayer,
  };
}