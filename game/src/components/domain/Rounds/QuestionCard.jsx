// game/src/components/domain/Rounds/QuestionCard.jsx
import { Button } from '../../ui/Button.jsx';
import { OptionsGrid } from './OptionsGrid.jsx';
import { TextAnswerInput } from '../TextAnswerInput/TextAnswerInput.jsx';
import { isAnswerCorrect } from '../../../hooks/answerCheck.js';
import { applyReversal } from '../../../lib/reverseText.js';

export function QuestionCard({
  eyebrow,
  prompt,
  options,
  correctValue,
  picked,
  revealed,
  onPick,
  onNext,
  nextLabel,
  labelFor,
  answerMode = 'choose',
  questionType,
  reversal,
  revealExtra,
}) {
  const supportsTyping = questionType !== 'name-position' && questionType !== 'lyrics-position';
  const useTyping = answerMode === 'type' && supportsTyping;

  const correctLabel =
    options.find(o => o.value === correctValue)?.label ?? correctValue;

  function handleTypedSubmit(rawInput) {
    const correct = isAnswerCorrect(rawInput, correctValue);
    onPick(rawInput, correct);
  }

  return (
    <div className="space-y-6">
      {eyebrow && (
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      )}

      {revealed && picked === '__TIMEOUT__' && (
        <p className="text-wrong text-sm">⏱ Time's up — you didn't answer in time.</p>
      )}

      <p className="text-xl font-bold text-ink leading-snug">{prompt}</p>

      {/* Reveal-only extra — the "Hear the song" card sits between the
          prompt and the options, so the player can play the song while
          still seeing their answer context below. */}
      {revealed && revealExtra && (
        <div className="rounded-md border border-border bg-surface-2 p-3 space-y-2">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Hear the song
          </p>
          {revealExtra}
        </div>
      )}

      {useTyping ? (
        <TextAnswerInput
          onSubmit={handleTypedSubmit}
          revealed={revealed}
          userAnswer={picked}
          correctLabel={correctLabel}
          correct={
            revealed && picked != null
              ? isAnswerCorrect(picked, correctValue)
              : null
          }
        />
      ) : (
        <OptionsGrid
          options={options}
          correctValue={correctValue}
          picked={picked}
          revealed={revealed}
          onPick={onPick}
          labelFor={labelFor}
          reversal={reversal}
        />
      )}

      {/* Next button below the options, only after reveal. */}
      {revealed && (
        <div className="flex justify-end pt-2">
          <Button onClick={onNext}>{nextLabel}</Button>
        </div>
      )}

      {revealed && reversal.reversed && (
        <div className="mt-4 rounded-md border border-border bg-surface-2 px-4 py-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-highlight">
            The answer was
          </p>
          <p className="text-base font-semibold text-ink" dir="auto">
            {labelFor(
              options.find(o => o.value === correctValue) ?? { label: correctValue }
            )}
          </p>
          <p className="text-xs text-ink-subtle">
            You saw it as{' '}
            <span dir="ltr" className="font-mono">
              {applyReversal(
                labelFor(options.find(o => o.value === correctValue) ?? { label: correctValue }),
                reversal.style
              )}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}