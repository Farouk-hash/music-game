// game/src/components/domain/Multiplayer/MultiplayerProgress.jsx
import { SegmentedProgress } from '../../ui/SegmentedProgress.jsx';

/**
 * Per-player progress bars for the multiplayer session.
 *
 * Each player gets one row:
 *   [name + current marker]                     [score / total]
 *   [segmented bar — one segment per player round]
 *
 * Segment semantics per player:
 *   - past round       → full fill, colored by tier
 *   - current round    → partial fill (once answered) or empty
 *   - future round     → empty track
 *
 * The player whose turn it is gets an accent-highlighted row.
 *
 * Props:
 *   players              — string[]
 *   scores               — number[] — correct count per player
 *   roundScores          — { [roundIndex]: { correct, total } }
 *   totalRounds          — total rounds in the game
 *   roundIndex           — current round index
 *   currentPlayerIndex   — whose turn
 */

function tierFor(correct, total) {
  if (!total || total === 0) return 'neutral';
  const ratio = correct / total;
  if (ratio >= 0.8) return 'correct';
  if (ratio >= 0.5) return 'highlight';
  return 'wrong';
}

/**
 * How many rounds does player `i` play in a game of `totalRounds`
 * with `playerCount` players? With 10 rounds and 3 players:
 *   P0 gets 4, P1 gets 3, P2 gets 3.
 */
function roundsForPlayer(i, totalRounds, playerCount) {
  if (playerCount <= 0 || totalRounds <= 0) return 0;
  return Math.floor((totalRounds - 1 - i) / playerCount) + 1;
}

export function MultiplayerProgress({
  players = [],
  scores = [],
  roundScores = {},
  totalRounds = 0,
  roundIndex = 0,
  currentPlayerIndex = 0,
}) {
  const playerCount = players.length;
  if (playerCount === 0 || totalRounds === 0) return null;

  return (
    <div className="space-y-2">
      {players.map((name, i) => {
        const total = roundsForPlayer(i, totalRounds, playerCount);
        const isCurrent = i === currentPlayerIndex;
        const score = scores[i] ?? 0;

        // Build one segment per round this player will play.
        // Global round index for the player's j-th turn:
        //   globalIndex = i + j * playerCount
        const segments = Array.from({ length: total }).map((_, j) => {
          const globalIdx = i + j * playerCount;
          const s = roundScores[globalIdx];

          // Completed round
          if (globalIdx < roundIndex) {
            const tier = s ? tierFor(s.correct, s.total) : 'neutral';
            return { fill: 1, tier };
          }

          // Current round — partial fill if answered
          if (globalIdx === roundIndex) {
            const correctSoFar = s?.correct ?? 0;
            const answeredSoFar = s?.answered ?? 0;
            const fill = s?.total ? answeredSoFar / s.total : 0;
            const tier = answeredSoFar > 0
              ? tierFor(correctSoFar, answeredSoFar)
              : 'neutral';
            return { fill, tier };
          }

          // Future round
          return { fill: 0, tier: 'neutral' };
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
                <span className="text-ink-subtle"> / {total}</span>
              </span>
            </div>

            <SegmentedProgress segments={segments} />
          </div>
        );
      })}
    </div>
  );
}