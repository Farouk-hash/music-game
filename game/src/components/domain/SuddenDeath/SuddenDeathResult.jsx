// game/src/components/domain/SuddenDeath/SuddenDeathResult.jsx
import { Link } from 'react-router-dom';

export default function SuddenDeathResult({
  phase, // 'batch-done' | 'finished'
  totals,
  winnerId,
  playerLabels = {},
  onNextBatch,
  onPlayAgain,
  onExit,
}) {
  const label = id => playerLabels[id] ?? id ?? '';

  const sorted = [...totals].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      {phase === 'finished' ? (
        <>
          <div className="text-5xl">🏆</div>
          <div className="text-2xl font-semibold text-ink">
            {label(winnerId)} wins!
          </div>
          <div className="text-sm text-ink-muted">
            Sudden death decided it.
          </div>
        </>
      ) : (
        <>
          <div className="text-5xl">🤝</div>
          <div className="text-2xl font-semibold text-ink">
            Still tied — sudden death again
          </div>
        </>
      )}

      <ul className="flex w-full max-w-sm flex-col gap-2">
        {sorted.map(({ id, score }) => {
          const isWinner = phase === 'finished' && id === winnerId;
          return (
            <li
              key={id}
              className={[
                'flex items-center justify-between rounded-md border px-4 py-3 transition-colors',
                isWinner
                  ? 'border-correct bg-correct-soft'
                  : 'border-border bg-surface-2',
              ].join(' ')}
            >
              <span
                className={[
                  'font-medium truncate',
                  isWinner ? 'text-correct' : 'text-ink-muted',
                ].join(' ')}
                dir="auto"
              >
                {label(id)}
                {isWinner && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-correct">
                    winner
                  </span>
                )}
              </span>
              <span
                className={[
                  'font-semibold tabular-nums',
                  isWinner ? 'text-correct' : 'text-ink-subtle',
                ].join(' ')}
              >
                {score}
              </span>
            </li>
          );
        })}
      </ul>

      {phase === 'batch-done' ? (
        <button
          type="button"
          onClick={onNextBatch}
          className="rounded-md bg-accent text-bg px-6 py-3 text-base font-medium transition-colors hover:bg-accent-2"
        >
          Another 5 questions
        </button>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="rounded-md bg-accent text-bg px-6 py-3 text-base font-medium transition-colors hover:bg-accent-2"
            >
              Play again
            </button>
          )}
          <Link
            to="/setup"
            className="rounded-md border border-border bg-surface-2 px-6 py-3 text-base font-medium text-ink transition-colors hover:bg-surface"
          >
            Change setup
          </Link>
        </div>
      )}
    </div>
  );
}