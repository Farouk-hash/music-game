// game/src/hooks/usePlayParams.js
import { useMemo } from 'react';
import { TIMER_SECONDS } from '../../constants/timer.js';
import { VALID_QUESTION_TYPES as VALID_TYPES } from '../../constants/questionTypes.js';

const VALID_REVERSED = new Set(['no', 'some', 'all']);
const VALID_INSTRUMENTS = new Set(['none', 'mixed', 'all']);

export function usePlayParams() {
  return useMemo(() => {
    let raw = {};
    try {
      const saved = sessionStorage.getItem('game.lastPlayParams');
      if (saved) raw = JSON.parse(saved);
    } catch {
      // fallback to empty object
    }

    // Ensure values are valid
    const genres = Array.isArray(raw.genres) ? raw.genres.map(Number) : [];
    const artists = Array.isArray(raw.artists) ? raw.artists.map(Number) : [];
    const years = Array.isArray(raw.years) ? raw.years.map(Number) : [];
    
    const rendition = raw.rendition === 'reverse' ? 'reverse' : 'forward';
    
    const types = Array.isArray(raw.types) 
      ? raw.types.filter(t => VALID_TYPES.has(t)) 
      : [];
      
    const answerMode = raw.answerMode === 'type' ? 'type' : 'choose';
    const timer = raw.timer === 'on' ? 'on' : 'off';
    
    const count = Math.min(20, Math.max(1, Number(raw.count) || 5));

    const reversed = VALID_REVERSED.has(raw.reversed) ? raw.reversed : 'no';
    const instruments = VALID_INSTRUMENTS.has(raw.instruments) ? raw.instruments : 'none';

    const timerSeconds = timer === 'on'
      ? (answerMode === 'type' ? TIMER_SECONDS.type : TIMER_SECONDS.choose)
      : TIMER_SECONDS.off;

    return {
      genres, artists, years, types, rendition,
      answerMode, timer, timerSeconds, count, reversed,
      instruments,
      // Expose level and players if they exist (for multiplayer)
      level: raw.level,
      players: Array.isArray(raw.players) ? raw.players : [],
      roundsPerPlayer: raw.roundsPerPlayer,
    };
  }, []);
}