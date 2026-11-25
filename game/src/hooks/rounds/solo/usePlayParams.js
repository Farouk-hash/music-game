// game/src/hooks/rounds/usePlayParams.js
import { useMemo } from 'react';
import { VALID_QUESTION_TYPES as VALID_TYPES } from '@/constants/questionTypes.js';

const VALID_REVERSED = new Set(['no', 'some', 'all']);
const VALID_INSTRUMENTS = new Set(['none', 'mixed', 'all']);
const VALID_MEMORY_MODES = new Set(['none', 'mixed', 'all']);
const VALID_MULTIPLAYER_MODES = new Set(['normal', 'hotpotato']);

// This hook only returns what it lists below, so every new setting that is saved
// in `game.lastPlayParams` (like `multiplayerMode`) MUST be added here too.
export function usePlayParams() {
  return useMemo(() => {
    let raw = {};
    try {
      const saved = sessionStorage.getItem('game.lastPlayParams');
      if (saved) raw = JSON.parse(saved);
    } catch {
      // fallback to empty object
    }

    const genres = Array.isArray(raw.genres) ? raw.genres.map(Number) : [];
    const artists = Array.isArray(raw.artists) ? raw.artists.map(Number) : [];
    const years = Array.isArray(raw.years) ? raw.years.map(Number) : [];

    const memoryGame = VALID_MEMORY_MODES.has(raw.memoryGame) ? raw.memoryGame : 'none';
    const multiplayerMode = VALID_MULTIPLAYER_MODES.has(raw.multiplayerMode)
      ? raw.multiplayerMode
      : 'normal';

    const rendition = raw.rendition === 'reverse' ? 'reverse' : 'forward';

    const types = Array.isArray(raw.types)
      ? raw.types.filter(t => VALID_TYPES.has(t))
      : [];

    const answerMode = raw.answerMode === 'type' ? 'type' : 'choose';

    // Read the timer as a number (or null/0)
    const timerSeconds = Number(raw.timer) || 0;
    const timer = timerSeconds > 0 ? 'on' : 'off';

    const count = Math.min(20, Math.max(1, Number(raw.count) || 5));

    const reversed = VALID_REVERSED.has(raw.reversed) ? raw.reversed : 'no';
    const instruments = VALID_INSTRUMENTS.has(raw.instruments) ? raw.instruments : 'none';

    const skips   = Number(raw.skips)   || 0;
    const removes = Number(raw.removes) || 0;
    const reveals = Number(raw.reveals) || 0;

    return {
      genres, artists, years, types, rendition,
      answerMode, timer, timerSeconds, count, reversed,
      instruments,
      skips, removes, reveals,
      memoryGame,

      // Multiplayer
      multiplayerMode,
      level: raw.level,
      players: Array.isArray(raw.players) ? raw.players : [],
      roundsPerPlayer: raw.roundsPerPlayer ?? raw.count,
    };
  }, []);
}