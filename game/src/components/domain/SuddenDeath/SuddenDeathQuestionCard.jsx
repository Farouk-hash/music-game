// game/src/components/domain/SuddenDeath/SuddenDeathQuestionCard.jsx
import { Button } from '../../ui/Button.jsx';
import { TimerBar } from '../../domain/Setup/Timer/Timerbar.jsx';
import { OptionsGrid } from '../Rounds/OptionsGrid.jsx';

/**
 * Options-mode question card for sudden death.
 *
 * `source` — 'instrumental' triggers the badge + accent frame.
 *
 * Reversed answers are skipped for `lyrics-track` (multi-line snippets).
 */
export function SuddenDeathQuestionCard({
  eyebrow,
  prompt,
  options,
  correctValue,
  questionType,
  source,
  picked,
  revealed,
  onPick,
  onNext,
  timeLeft,
  totalSeconds,
  timedOut,
  labelFor = (o) => o.label,
  reversal,
}) {
  const isInstrumental = source === 'instrumental';
  const effectiveReversal =
    questionType === 'lyrics-track'
      ? { reversed: false, style: null }
      : reversal;

  return (
    <div
      className={[
        'space-y-6',
        isInstrumental
          ? 'rounded-md border border-accent-2 bg-accent-soft p-4'
          : '',
      ].join(' ')}
    >
      {isInstrumental && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-2 bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold text-accent-2 uppercase tracking-[0.15em]">
          <span aria-hidden>🎼</span>
          Instrumental
        </span>
      )}

      {eyebrow && (
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          {eyebrow}
        </p>
      )}

      {timeLeft != null && totalSeconds > 0 && (
        <TimerBar
          timeLeft={timeLeft}
          total={totalSeconds}
          timedOut={timedOut}
        />
      )}

      {revealed && timedOut && (
        <p className="text-wrong text-sm">
          ⏱ Time&apos;s up — you didn&apos;t answer in time.
        </p>
      )}

      <p className="text-xl font-bold text-ink leading-snug">{prompt}</p>

      <OptionsGrid
        options={options}
        correctValue={correctValue}
        picked={picked}
        revealed={revealed}
        onPick={onPick}
        labelFor={labelFor}
        reversal={effectiveReversal}
      />

      {revealed && (
        <div className="flex justify-end pt-2">
          <Button onClick={onNext}>Pass to next player →</Button>
        </div>
      )}
    </div>
  );
}