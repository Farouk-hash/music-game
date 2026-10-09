// game/src/components/domain/SuddenDeath/SuddenDeathQuestionCard.jsx
import { Button } from '../../ui/Button.jsx';
import { TimerBar } from '../../domain/Setup/Timer/Timerbar.jsx';
import { OptionsGrid } from '../Rounds/OptionsGrid.jsx';

/**
 * Options-mode question card for sudden death.
 *
 * Flow per question, per player:
 *   1. Show prompt + timer + options (unmarked).
 *   2. Player clicks an option → onPick(value) → parent marks revealed.
 *   3. Reveal: picked option highlighted, correct answer green,
 *      timer paused, "Pass to next player →" button appears.
 *   4. Parent advances to next player. This card receives `picked=null`
 *      and `revealed=false` again — options reset for the new player.
 *
 * The timer is owned by the parent (see useQuestionTimer). This card
 * only renders the bar and reflects `timeLeft`.
 *
 * @param {object}   props
 * @param {string}   props.eyebrow         — "TRACK" / "ARTIST" / etc.
 * @param {string}   props.prompt
 * @param {Array}    props.options         — [{ label, value }]
 * @param {string}   props.correctValue
 * @param {string}   props.questionType
 * @param {*}        props.picked          — current player's pick (or null)
 * @param {boolean}  props.revealed        — true once current player has picked
 * @param {(value) => void} props.onPick
 * @param {() => void} props.onNext        — "Pass to next player"
 * @param {number}   props.timeLeft
 * @param {number}   props.totalSeconds
 * @param {boolean}  props.timedOut
 * @param {Function} props.labelFor
 * @param {object}   [props.reversal]
 */
export function SuddenDeathQuestionCard({
  eyebrow,
  prompt,
  options,
  correctValue,
  questionType,
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
  return (
    <div className="space-y-6">
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
        reversal={reversal}
      />

      {revealed && (
        <div className="flex justify-end pt-2">
          <Button onClick={onNext}>Pass to next player →</Button>
        </div>
      )}
    </div>
  );
}