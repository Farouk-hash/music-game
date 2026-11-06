// game/src/hooks/useMultiplayerParams.js
import { useMemo } from 'react';
import { usePlayParams } from './usePlayParams.js';

export function useMultiplayerParams() {
  const base = usePlayParams();

  return useMemo(() => {
    return {
      ...base,
      // These are extracted from raw in usePlayParams
      players: base.players || [],
      level: base.level || 1,
      roundsPerPlayer: base.roundsPerPlayer || base.count,
    };
  }, [base]);
}