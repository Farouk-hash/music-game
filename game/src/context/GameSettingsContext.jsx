// game/src/context/GameSettingsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Shared game settings across all play modes.
 *
 *   questionTypes    — array of type strings (8 total)
 *   answerMode       — 'choose' | 'type'
 *   roundCount       — integer, single-player rounds
 *   reversedAnswers  — 'no' | 'some' | 'all'
 *   timer            — 'off' | 'on'
 *
 * Persisted to localStorage (except roundCount and questionTypes,
 * which reset per session by design).
 */

const ALL_TYPES = [
  'name-track',
  'name-artist',
  'name-album',
  'name-featured',
  'name-position',
  'lyrics-track',
  'lyrics-artist',
  'lyrics-album',
];

const GameSettingsContext = createContext(null);

export function GameSettingsProvider({ children }) {
  const [questionTypes, setQuestionTypes] = useState(ALL_TYPES);
  const [answerMode, setAnswerMode] = useState(() =>
    localStorage.getItem('game.answerMode') || 'choose'
  );
  const [roundCount, setRoundCount] = useState(10);
  const [reversedAnswers, setReversedAnswers] = useState(() =>
    localStorage.getItem('game.reversedAnswers') || 'no'
  );
  const [timer, setTimer] = useState(() =>
    localStorage.getItem('game.timer') || 'off'
  );

  const [audioRendition, setAudioRendition] = useState(() =>
    localStorage.getItem('game.audioRendition') || 'forward'
  );

  useEffect(() => {
    localStorage.setItem('game.answerMode', answerMode);
    localStorage.setItem('game.reversedAnswers', reversedAnswers);
    localStorage.setItem('game.timer', timer);
    localStorage.setItem('game.audioRendition', audioRendition);
  }, [answerMode, reversedAnswers, timer, audioRendition]);

  const value = {
    ALL_TYPES,
    questionTypes, setQuestionTypes,
    answerMode, setAnswerMode,
    roundCount, setRoundCount,
    reversedAnswers, setReversedAnswers,
    timer, setTimer,
    audioRendition, setAudioRendition,
  };

  return (
    <GameSettingsContext.Provider value={value}>
      {children}
    </GameSettingsContext.Provider>
  );
}

export function useGameSettings() {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) throw new Error('useGameSettings must be used inside <GameSettingsProvider>');
  return ctx;
}