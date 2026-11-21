// game/src/hooks/rounds/useGameEngineL3.js
import { usePlaySession } from '@/hooks/rounds/usePlaySession.js';
import { useLifelines } from '@/hooks/rounds/useLifelines.js';

export function useGameEngineL3(fetchHook, params) {
  const { data, isLoading, error, refetch } = fetchHook(params);
  const sets = data?.sets ?? [];

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
    await refetch();
    lifelines.reset();
    session.restart();
  };

  return {
    rounds: sets, // Alias for consistency
    isLoading,
    error,
    session,
    lifelines,
    totalLifelineCost,
    handleReplay,
  };
}