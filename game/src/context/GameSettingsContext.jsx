// game/src/context/GameSettingsContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QUESTION_TYPE_VALUES } from '@/constants/questionTypes.js';

const GameSettingsContext = createContext(null);

export function GameSettingsProvider({ children }) {
  const [questionTypes, setQuestionTypes] = useState(QUESTION_TYPE_VALUES);
  const [answerMode, setAnswerMode] = useState(() =>
    localStorage.getItem('game.answerMode') || 'choose'
  );
  const [roundCount, setRoundCount] = useState(10);
  const [reversedAnswers, setReversedAnswers] = useState(() =>
    localStorage.getItem('game.reversedAnswers') || 'no'
  );
  
  // UPDATED: Read as number or null, fallback to null (No timer)
  const [timer, setTimer] = useState(() => {
    const saved = localStorage.getItem('game.timer');
    if (!saved || saved === 'off') return null; 
    return Number(saved) || null;
  });

  const [audioRendition, setAudioRendition] = useState(() =>
    localStorage.getItem('game.audioRendition') || 'forward'
  );

  const [instruments, setInstruments] = useState(() => {
    const saved = localStorage.getItem('game.instruments');
    return ['none', 'mixed', 'all'].includes(saved) ? saved : 'none';
  });

  useEffect(() => {
    localStorage.setItem('game.answerMode', answerMode);
    localStorage.setItem('game.reversedAnswers', reversedAnswers);
    
    // UPDATED: Store 'off' if timer is null, otherwise store the number
    localStorage.setItem('game.timer', timer === null ? 'off' : String(timer));
    
    localStorage.setItem('game.audioRendition', audioRendition);
    localStorage.setItem('game.instruments', instruments);
  }, [answerMode, reversedAnswers, timer, audioRendition, instruments]);

  // Bulk apply — used when launching from a collection
  const applySettings = useCallback((partial) => {
    if (partial.questionTypes !== undefined) setQuestionTypes(partial.questionTypes);
    if (partial.answerMode !== undefined) setAnswerMode(partial.answerMode);
    if (partial.roundCount !== undefined) setRoundCount(partial.roundCount);
    if (partial.reversedAnswers !== undefined) setReversedAnswers(partial.reversedAnswers);
    if (partial.timer !== undefined) setTimer(partial.timer === 'off' ? null : partial.timer);
    if (partial.audioRendition !== undefined) setAudioRendition(partial.audioRendition);
    if (partial.instruments !== undefined) setInstruments(partial.instruments);
  }, []);

  const value = {
    ALL_TYPES: QUESTION_TYPE_VALUES,
    questionTypes, setQuestionTypes,
    answerMode, setAnswerMode,
    roundCount, setRoundCount,
    reversedAnswers, setReversedAnswers,
    timer, setTimer,
    audioRendition, setAudioRendition,
    instruments, setInstruments,
    applySettings,
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