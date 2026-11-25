import { Button } from '@/components/ui/Button.jsx';
import { OptionsGrid } from './OptionsGrid.jsx';
import { TextAnswerInput } from '../TextAnswerInput/TextAnswerInput.jsx';
import { isAnswerCorrect } from '@/hooks/rounds/features/answerCheck.js';
import { applyReversal } from '@/lib/reverseText.js';
import { Reveal } from '@/components/ui/Reveal.jsx';
import { LifelinesBar } from './LifelinesBar.jsx';

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
  source,
  reversal,
  revealExtra,
  showNextButton = true,
  disabled = false,
  lifelines = null,
  onLifelineSkip,
  onLifelineRemove,
  onLifelineReveal,
  hiddenOptionValue = null,
}) {
  const isInstrumental = source === 'instrumental';
  const supportsTyping = questionType !== 'name-position' && questionType !== 'lyrics-position';
  const useTyping = answerMode === 'type' && supportsTyping;

  const correctLabel = options?.find(o => o.value === correctValue)?.label ?? correctValue;
  const effectiveReversal = questionType === 'lyrics-track'
    ? { reversed: false, style: null }
    : reversal;
  const revealKey = `${questionType}-${prompt}`;

  function handleTypedSubmit(rawInput) {
    const correct = isAnswerCorrect(rawInput, correctValue);
    onPick(rawInput, correct);
  }

  const optionsDisabled = disabled || revealed;
  const showLifelines = lifelines && !lifelines.allZero && !revealed && !disabled;

  return (
    <div className={['space-y-6', isInstrumental ? 'rounded-md border border-accent-2 bg-accent-soft p-4' : ''].join(' ')}>
      <div className="space-y-4">
        {isInstrumental && (
          <Reveal key={`badge-${revealKey}`} direction="down" delay={0}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-2 bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-accent-2 uppercase tracking-[0.15em]">
              <span aria-hidden>🎼</span> Instrumental
            </span>
          </Reveal>
        )}
        {eyebrow && (
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">{eyebrow}</p>
        )}
        <p className="text-xl font-bold text-ink leading-snug">{prompt}</p>
      </div>

      {showLifelines && (
        <LifelinesBar
          lifelines={lifelines}
          onSkip={onLifelineSkip}
          onRemove={onLifelineRemove}
          onReveal={onLifelineReveal}
          disabled={disabled}
          removeDisabled={hiddenOptionValue !== null}
        />
      )}

      {revealed && picked === '__TIMEOUT__' && <p className="text-wrong text-sm">⏱ Time's up — you didn't answer in time.</p>}
      {revealed && picked === '__SKIP__' && <p className="text-ink-muted text-sm">⏭ Skipped.</p>}
      {revealed && picked === '__REVEAL__' && <p className="text-ink-muted text-sm">👁 Answer revealed.</p>}

      {revealed && revealExtra && (
        <div className="w-full flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3 sm:p-4">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Hear the song</p>
          <div className="w-full">{revealExtra}</div>
        </div>
      )}

      <Reveal key={`input-${revealKey}`} direction="up" delay={250} distance={40}>
        {useTyping ? (
          <TextAnswerInput
            onSubmit={handleTypedSubmit}
            revealed={revealed}
            userAnswer={picked}
            correctLabel={correctLabel}
            correct={revealed && picked != null ? isAnswerCorrect(picked, correctValue) : null}
          />
        ) : (
          <OptionsGrid
            options={options}
            correctValue={correctValue}
            picked={picked}
            revealed={revealed}
            onPick={optionsDisabled ? () => {} : onPick}
            labelFor={labelFor}
            reversal={effectiveReversal}
            hiddenValue={hiddenOptionValue}
          />
        )}
      </Reveal>

      {showNextButton && revealed && (
        <div className="flex justify-end pt-2">
          <Button onClick={onNext}>{nextLabel}</Button>
        </div>
      )}

      {revealed && effectiveReversal?.reversed && (
        <div className="mt-4 rounded-md border border-border bg-surface-2 px-4 py-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-highlight">The answer was</p>
          <p className="text-base font-semibold text-ink" dir="auto">
            {labelFor(options?.find(o => o.value === correctValue) ?? { label: correctValue })}
          </p>
          <p className="text-xs text-ink-subtle">
            You saw it as{' '}
            <span dir="ltr" className="font-mono">
              {applyReversal(labelFor(options?.find(o => o.value === correctValue) ?? { label: correctValue }), effectiveReversal.style)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}