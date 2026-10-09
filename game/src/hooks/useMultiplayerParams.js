// game/src/hooks/useMultiplayerParams.js
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlayParams } from './usePlayParams.js';

/**
 * Extends the base play params with multiplayer-specific fields.
 *
 * URL shape:
 *   /play-multi?genres=1&artists=5&years=1977
 *              &players=Ali,Sara,Omar&level=2&count=5
 *              &answerMode=choose&timer=off&reversed=no
 *
 * Adds:
 *   players         — string[] of names
 *   level           — 1 | 2
 *   roundsPerPlayer — alias of base.count
 */
export function useMultiplayerParams() {
  const [searchParams] = useSearchParams();
  const base = usePlayParams();

  return useMemo(() => {
    const raw = searchParams.get('players') || '';
    const players = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const level = (() => {
      const v = searchParams.get('level');
      if (v === '2' || v === 'two') return 2;
      return 1;
    })();

    return {
      ...base,
      players,
      level,
      roundsPerPlayer: base.count,
    };
  }, [searchParams, base]);
}