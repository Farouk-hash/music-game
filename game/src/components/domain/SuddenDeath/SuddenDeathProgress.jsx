// game/src/components/domain/SuddenDeath/SuddenDeathProgress.jsx
import { SegmentedProgress } from '../../ui/SegmentedProgress.jsx';

/**
 * Sudden-death progress bar.
 *
 * Every player answers every question in sudden death, so each player
 * gets one segment per question. Segment fill reflects "has this
 * player answered question i":
 *
 *   future question (q > qIndex)               → empty track
 *   current question, not yet answered          → empty track
 *   current question, answered but not revealed → filled, NEUTRAL tier
 *                                                  (privacy: the next player
 *                                                   must not learn the result)
 *   past question (q < qIndex)                  → filled, colored tier
 *   current question, revealed                  → filled, colored tier
 *
 * The `phase` prop tells us when the current question's result has been
 * publicly revealed. `phase === 'reveal'` unlocks the tier for `qIndex`.
 *
 * @param {object}   props
 * @param {string[]} props.players          — display names
 * @param {number[]} props.scores           — running correct totals
 * @param {object}   props.perQuestion      — { [qIndex]: { [playerId]: 'correct' | 'wrong' | 'answered' | null } }
 * @param {string[]} props.playerIds        — parallel to `players`
 * @param {number}   props.totalQuestions   — number of questions in this batch
 * @param {number}   props.qIndex           — current question index
 * @param {number}   props.playerIndex      — whose turn it is
 * @param {string}   props.phase            — 'answering' | 'handoff' | 'reveal' | ...
 */
export function SuddenDeathProgress({
  players = [],
  scores = [],
  perQuestion = {},
  playerIds = [],
  totalQuestions = 0,
  qIndex = 0,
  playerIndex = 0,
  phase = 'answering',
}) {
  const playerCount = players.length;
  if (playerCount === 0 || totalQuestions === 0) return null;

  // The current question's result becomes public once the reveal phase
  // begins. Earlier questions are public by definition. Later questions
  // haven't been seen yet.
  const currentIsPublic = phase === 'reveal'
    || phase === 'batch-done'
    || phase === 'finished';

  return (
    <div className="space-y-2">
      {players.map((name, i) => {
        const pid = playerIds[i];
        const isCurrent = i === playerIndex;
        const score = scores[i] ?? 0;

        const segments = Array.from({ length: totalQuestions }).map((_, q) => {
          const result = perQuestion?.[q]?.[pid]; // 'correct' | 'wrong' | 'answered' | null

          // Not answered yet → empty.
          if (result == null || result === 'none') {
            return { fill: 0, tier: 'neutral' };
          }

          // Past question: always public.
          if (q < qIndex) {
            const tier =
              result === 'correct' ? 'correct'
              : result === 'wrong' ? 'wrong'
              : 'neutral';
            return { fill: 1, tier };
          }

          // Current question: public only after reveal.
          if (q === qIndex) {
            if (!currentIsPublic) {
              // Answered, but hide the tier.
              return { fill: 1, tier: 'neutral' };
            }
            const tier =
              result === 'correct' ? 'correct'
              : result === 'wrong' ? 'wrong'
              : 'neutral';
            return { fill: 1, tier };
          }

          // Future question — shouldn't have a result, but guard anyway.
          return { fill: 1, tier: 'neutral' };
        });

        return (
          <div
            key={i}
            className={[
              'rounded-md border px-3 py-2 space-y-1.5 transition-colors',
              isCurrent
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface-2',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={[
                  'text-sm truncate',
                  isCurrent ? 'text-ink font-semibold' : 'text-ink-muted',
                ].join(' ')}
                dir="auto"
              >
                {name}
                {isCurrent && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">
                    ● your turn
                  </span>
                )}
              </span>
              <span className="text-xs tabular-nums shrink-0">
                <span className={isCurrent ? 'text-ink font-semibold' : 'text-ink-subtle'}>
                  {score}
                </span>
                <span className="text-ink-subtle"> / {totalQuestions}</span>
              </span>
            </div>

            <SegmentedProgress segments={segments} />
          </div>
        );
      })}
    </div>
  );
}