// game/src/components/domain/Multiplayer/HotPotatoRevealScreen.jsx
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { isAnswerCorrect } from '@/hooks/rounds/features/answerCheck.js';
import { POSITION_LABELS } from '@/constants';

const TIMEOUT = '__TIMEOUT__';

// Option values are normalized strings; show the readable label instead.
// Typed answers have no matching option and are shown as typed.
function labelFor(round, value) {
  const opt = round.options?.find((o) => o.value === value);
  if (round.type === 'name-position') return POSITION_LABELS?.[value] ?? opt?.label ?? value;
  return opt?.label ?? value;
}

export function HotPotatoRevealScreen({
  players,
  sharedRounds,
  hiddenAnswers,
  aggregatedScores,
  onDismiss,
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 pt-8 px-1">
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">🥔 Hot Potato Results</p>
        <h2 className="text-2xl font-bold text-ink">All Answers Revealed</h2>
        <p className="text-sm text-ink-muted">
          See how everyone performed across {sharedRounds.length} shared questions.
        </p>
      </div>

      <div className="space-y-4">
        {sharedRounds.map((round, ri) => (
          <BorderContainer key={round.id ?? ri} border="all" className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center bg-accent-soft text-accent">
                {ri + 1}
              </span>
              <div className="flex-1">
                <p className="text-base font-medium text-ink leading-snug" dir="auto">{round.prompt}</p>
                <p className="text-xs text-correct mt-1" dir="auto">
                  ✓ Correct: {round.correctLabel ?? labelFor(round, round.correctValue)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-10">
              {players.map((name, pi) => {
                const answer = hiddenAnswers.get(`${round.id}-${pi}`);
                const wasTimeout = answer === TIMEOUT;
                const answered = answer != null && !wasTimeout;
                // Same rule as the scoring, so a ✓ here always matches the score.
                const isCorrect =
                  answered &&
                  (answer === round.correctValue || isAnswerCorrect(answer, round.correctValue));

                return (
                  <div
                    key={pi}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      isCorrect
                        ? 'border-correct/50 bg-correct-soft/10'
                        : 'border-wrong/50 bg-wrong-soft/10'
                    }`}
                  >
                    <p className="text-xs text-ink-subtle truncate" dir="auto">{name}</p>
                    <p
                      className={`font-medium mt-0.5 ${isCorrect ? 'text-correct' : 'text-wrong'}`}
                      dir="auto"
                    >
                      {wasTimeout ? '⏱ Timeout' : answered ? labelFor(round, answer) : '—'}
                      {answered ? (isCorrect ? ' ✓' : ' ✗') : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </BorderContainer>
        ))}
      </div>

      <BorderContainer border="all" className="p-5">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em] mb-3">Final Standings</p>
        <div className="space-y-2">
          {[...players.entries()]
            .map(([i, name]) => ({ name, score: aggregatedScores[i] }))
            .sort((a, b) => b.score - a.score)
            .map(({ name, score }, rank) => (
              <div key={rank} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2">
                <span className="text-sm font-medium" dir="auto">
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}{' '}{name}
                </span>
                <span className="tabular-nums font-bold text-highlight">{score}</span>
              </div>
            ))}
        </div>
      </BorderContainer>

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={onDismiss} className="w-full max-w-xs">See Leaderboard →</Button>
      </div>
    </div>
  );
}