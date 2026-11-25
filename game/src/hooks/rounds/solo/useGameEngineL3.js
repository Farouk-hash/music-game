// game/src/hooks/rounds/useGameEngineL3.js
import { useMemo } from 'react';
import { usePlaySession } from '@/hooks/rounds/solo/usePlaySession.js';
import { useLifelines } from '@/hooks/rounds/features/useLifelines.js';
import { tagMemoryRounds } from '../../memory/tagMemoryRounds.js';

const EMPTY = [];

export function useGameEngineL3(fetchHook, params) {
  const { data, isLoading, error, refetch } = fetchHook(params);

  // Tag memory questions for Level 3 sets
  const sets = useMemo(
    () => tagMemoryRounds(data?.sets ?? EMPTY, params.memoryGame),
    [data, params.memoryGame]
  );

  // usePlaySession naturally maps 'sets' to 'rounds'
  const session = usePlaySession(sets, { timerSeconds: params.timerSeconds });

  const lifelines = useLifelines(
    { skips: params.skips ?? 0, removes: params.removes ?? 0, reveals: params.reveals ?? 0 },
    params.count
  );

  const totalLifelineCost = Object.values(session.roundScores).reduce(
    (sum, r) => sum + (r.cost || 0),
    0
  );

  const handleReplay = async () => {
    if (!navigator.onLine) return; // refetch would hang while offline
    await refetch();
    lifelines.reset();
    session.restart();
  };

  return {
    rounds: sets, // alias for consistency with L1/L2
    isLoading,
    error,
    session,
    lifelines,
    totalLifelineCost,
    handleReplay,
  };
}