// game/src/hooks/useRoundReversal.js
import { useMemo } from 'react';
import { randomStyle } from '../lib/reverseText.js';

/**
 * Given a tier ('no' | 'some' | 'all') and the current round index,
 * deterministically decide whether this round is reversed, and if so
 * which style. The result is memoized on (tier, roundIndex) so a
 * re-render doesn't re-roll.
 *
 * Returns: { reversed: bool, style: 'words' | 'letters' | null }
 */
export function useRoundReversal(tier, roundIndex) {
  return useMemo(() => {
    if (tier === 'no' || tier === null || tier === undefined) {
      return { reversed: false, style: null };
    }
    if (tier === 'all') {
      return { reversed: true, style: randomStyle() };
    }
    // tier === 'some' — coin flip per round
    const reversed = Math.random() < 0.5;
    return reversed
      ? { reversed: true, style: randomStyle() }
      : { reversed: false, style: null };
  }, [tier, roundIndex]);
}