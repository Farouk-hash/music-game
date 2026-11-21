// game/src/hooks/rounds/useGameEngine.js
import { usePlaySession } from '@/hooks/rounds/usePlaySession.js';
import { useLifelines } from '@/hooks/rounds/useLifelines.js';
import { useRoundReversal } from '@/hooks/rounds/useRoundReversal.js';

/**
 * Unified game engine hook.
 * @param {Function} fetchHook - The TanStack query hook to use (e.g., useRound, useRoundMulti)
 * @param {Object} params - The game parameters from usePlayParams()
 * @param {Function} normalizeFn - Optional function to reshape the raw rounds data (used for Level 1)
 */
export function useGameEngine(fetchHook, params, normalizeFn = (r) => r) {
  const { data, isLoading, error, refetch } = fetchHook(params);
  const rawRounds = data?.rounds ?? [];
  const rounds = normalizeFn(rawRounds);

  const session = usePlaySession(rounds, { timerSeconds: params.timerSeconds });
  const reversal = useRoundReversal(params.reversed, session.roundIndex);
  
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

  const handleSkip = () => {
    if (!lifelines.canSkip) return;
    lifelines.useSkip();
    session.skip();
  };

  const handleRemove = () => {
    if (!lifelines.canRemove || session.revealed) return;
    if (session.alreadyRemovedHere) return;
    const q = session.currentQuestion;
    const wrongOptions = q.options.filter(o => o.value !== q.correctValue);
    if (wrongOptions.length === 0) return;
    const pick = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    lifelines.useRemove();
    session.hideOption(pick.value);
  };

  const handleReveal = () => {
    if (!lifelines.canReveal || session.revealed) return;
    lifelines.useReveal();
    session.revealAnswer();
  };

  return {
    rounds,
    isLoading,
    error,
    session,
    reversal,
    lifelines,
    totalLifelineCost,
    handleReplay,
    handleSkip,
    handleRemove,
    handleReveal,
  };
}