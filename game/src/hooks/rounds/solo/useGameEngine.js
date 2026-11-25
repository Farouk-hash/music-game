// game/src/hooks/rounds/useGameEngine.js
import { useMemo } from 'react';
import { usePlaySession } from '@/hooks/rounds/solo/usePlaySession.js';
import { useLifelines } from '@/hooks/rounds/features/useLifelines.js';
import { useRoundReversal } from '@/hooks/rounds/features/useRoundReversal.js';
import { tagMemoryRounds } from '../../memory/tagMemoryRounds.js';

const EMPTY = [];
const identity = (r) => r;

/**
 * Unified game engine hook for Level 1 & 2.
 * normalizeFn takes the raw rounds ARRAY and must have a stable identity
 * (define it at module scope).
 */
export function useGameEngine(fetchHook, params, normalizeFn = identity) {
  const { data, isLoading, error, refetch } = fetchHook(params);

  // Normalize, THEN tag memory questions. Stable until the data or mode changes.
  const rounds = useMemo(
    () => tagMemoryRounds(normalizeFn(data?.rounds ?? EMPTY), params.memoryGame),
    [data, normalizeFn, params.memoryGame]
  );

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
    if (!navigator.onLine) return; // refetch would hang while offline
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
    const wrongOptions = q.options.filter((o) => o.value !== q.correctValue);
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