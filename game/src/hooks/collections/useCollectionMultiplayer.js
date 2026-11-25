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

  const openMultiplayerFor = useCallback((collection, { onCloseReadOnly } = {}) => {
    const rounds = Array.isArray(collection.rounds) ? collection.rounds : [];
    const levels = collection.levels 
      ? Array.from(collection.levels).sort((a, b) => a - b) 
      : [];

    const firstLevel = levels.length > 0 ? levels[0] : null;
    const seedRound = firstLevel != null
      ? rounds.find(r => Number(r.level) === Number(firstLevel))
      : rounds[0];

    if (seedRound) {
      settings.applySettings({
        questionTypes: seedRound.questionTypes || [],
        answerMode: seedRound.answerMode || 'choose',
        reversedAnswers: seedRound.reversedAnswers || 'no',
        timer: seedRound.timer ?? null,
        audioRendition: seedRound.reversedAudio ? 'reverse' : 'forward',
        instruments: seedRound.instruments || 'none',
        roundCount: seedRound.rounds || 10,
        
        // ✅ NEW: Apply lifelines and memory mode to global settings
        skips: seedRound.skips ?? 0,
        removes: seedRound.removes ?? 0,
        reveals: seedRound.reveals ?? 0,
        memoryGame: seedRound.memoryGame || 'none',
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

    const levelsAvailable = col.levels 
      ? Array.from(col.levels).sort((a, b) => a - b) 
      : [];

    const effectiveLevel = levelsAvailable.length > 0
      ? (levelsAvailable.includes(level) ? level : levelsAvailable[0])
      : 1;

    const rounds = Array.isArray(col.rounds) ? col.rounds : [];
    let targetRound = rounds.find(r => Number(r.level) === Number(effectiveLevel));
    
    if (!targetRound && rounds.length > 0) {
      targetRound = rounds[0];
    }

    if (!targetRound) {
      show({ message: `No round config found for Level ${effectiveLevel}.` });
      return;
    }

    const actualLevel = targetRound.level || effectiveLevel;

    const payload = {
      genres: col.genresIds || [],
      artists: col.artistsIds || [],
      years: col.years?.values || [],
      types: targetRound.questionTypes || [],
      answerMode: targetRound.answerMode || 'choose',
      timer: targetRound.timer ?? null,
      reversed: targetRound.reversedAnswers || 'no',
      instruments: targetRound.instruments || 'none',
      rendition: targetRound.reversedAudio ? 'reverse' : 'forward',
      count: targetRound.rounds || 10,
      players: names,
      level: actualLevel,
      roundsPerPlayer,
      
      // ✅ NEW: Include lifelines and memory mode in multiplayer payload
      skips: targetRound.skips ?? 0,
      removes: targetRound.removes ?? 0,
      reveals: targetRound.reveals ?? 0,
      memoryGame: targetRound.memoryGame || 'none',
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