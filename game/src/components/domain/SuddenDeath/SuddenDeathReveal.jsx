// game/src/components/domain/SuddenDeath/SuddenDeathReveal.jsx
import { Button } from '../../ui/Button.jsx';
import { isCorrectForQuestion } from '../../../hooks/sudden-death/useSuddenDeath.js';

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

export default function SuddenDeathReveal({
  question,
  answers,
  playerIds,
  playerLabels = {},
  totals,
  isLastQuestion,
  onNext,
}) {
  if (!question) return null;

  const label = id => playerLabels[id] ?? id ?? '';

  const correctDisplay =
    question.type === 'name-position'
      ? POSITION_LABELS[question.correctValue] ?? question.correctValue
      : question.correctValue;

  return (
    <div className="space-y-6">
      {/* Correct answer block — same style as QuestionCard's revealExtra */}
      <div className="rounded-md border border-border bg-surface-2 p-3 space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Correct answer
        </p>
        <p className="text-base font-semibold text-ink" dir="auto">
          {correctDisplay}
        </p>
      </div>

      {/* Per-player rows — full-opacity borders (opacity modifiers don't
          work on Tailwind classes that map to var(...) without an RGB
          triplet). */}
      <ul className="space-y-2">
        {playerIds.map(id => {
          const typed = answers?.[id] ?? '';
          const ok = isCorrectForQuestion(question, typed);
          const score = totals.find(t => t.id === id)?.score ?? 0;
          return (
            <li
              key={id}
              className={[
                'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                ok
                  ? 'border-correct bg-correct-soft'
                  : 'border-wrong bg-wrong-soft',
              ].join(' ')}
            >
              <span className="flex-1 font-medium text-ink truncate" dir="auto">
                {label(id)}
              </span>
              <span
                className={[
                  'text-sm tabular-nums',
                  ok ? 'text-correct' : 'text-wrong',
                ].join(' ')}
                dir="auto"
              >
                {typed || '—'}
              </span>
              <span className="text-xs text-ink-subtle tabular-nums shrink-0">
                total {score}
              </span>
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold shrink-0',
                  ok
                    ? 'bg-correct-soft text-correct'
                    : 'bg-wrong-soft text-wrong',
                ].join(' ')}
              >
                {ok ? '✓' : '✕'}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext}>
          {isLastQuestion ? 'See result' : 'Next question'}
        </Button>
      </div>
    </div>
  );
}