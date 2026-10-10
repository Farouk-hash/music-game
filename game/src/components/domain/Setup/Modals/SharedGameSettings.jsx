// game/src/components/domain/Setup/Modals/SharedGameSettings.jsx
import { QuestionTypePicker } from '../QuestionTypePicker/QuestionTypePicker.jsx';
import { AnswerModePicker } from '../AnswerModePicker/AnswerModePicker.jsx';
import { RoundCountPicker } from '../RoundCountPicker/RoundCountPicker.jsx';
import { ReversedAnswersPicker } from '../ReversedAnswersPicker/ReversedAnswersPicker.jsx';
import { TimerPicker } from '../Timer/TimerPicker.jsx';
import { InstrumentsPicker } from '../Instruments/InstrumentsPicker.jsx';
import { useGameSettings } from '../../../../context/GameSettingsContext.jsx';

/**
 * The shared game-settings block embedded in every level modal.
 *
 * Reads/writes from GameSettingsContext so changing a value in one
 * modal affects all of them.
 *
 *   <SharedGameSettings disabledTypes={disabledTypes} />
 *
 * `hideRoundCount` — pass true in multiplayer, which has its own
 * rounds-per-player control.
 *
 * `allowInstruments` — pass false in levels that don't support
 * instrumental rounds (currently L3). The picker renders disabled.
 */
export function SharedGameSettings({
  disabledTypes = new Set(),
  hideRoundCount = false,
  reversedClipsCount = 0,
  allowInstruments = true,
}) {
  const {
    questionTypes, setQuestionTypes,
    answerMode, setAnswerMode,
    roundCount, setRoundCount,
    reversedAnswers, setReversedAnswers,
    timer, setTimer,
    audioRendition, setAudioRendition,
    instruments, setInstruments,
  } = useGameSettings();
  const reversedAudioAvailable = reversedClipsCount > 0;

  return (
    <div className="space-y-6">
      {/* Question types */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Question types
        </h3>
        <QuestionTypePicker
          value={questionTypes}
          onChange={setQuestionTypes}
          disabledTypes={disabledTypes}
        />
      </section>

      {/* Answer mode */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Answer mode
        </h3>
        <p className="text-xs text-ink-muted">
          Choose from options, or type the answer yourself.
        </p>
        <AnswerModePicker value={answerMode} onChange={setAnswerMode} />
      </section>

      {/* Rounds — hidden in multiplayer */}
      {!hideRoundCount && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Rounds
          </h3>
          <p className="text-xs text-ink-muted">
            How many clips do you want to guess?
          </p>
          <RoundCountPicker value={roundCount} onChange={setRoundCount} />
        </section>
      )}

      {/* Reversed answers */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Reversed answers
        </h3>
        <p className="text-xs text-ink-muted">
          Flip the answers — read them backwards, or as scrambled letters.
        </p>
        <ReversedAnswersPicker value={reversedAnswers} onChange={setReversedAnswers} />
      </section>

      {/* Reversed audio */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Reversed audio
        </h3>
        <p className="text-xs text-ink-muted">
          Play the clip backwards instead of forwards.
          {!reversedAudioAvailable && (
            <> No reversed renditions available yet — the toggle is disabled until you create some.</>
          )}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!reversedAudioAvailable}
            onClick={() => setAudioRendition('forward')}
            aria-pressed={audioRendition === 'forward'}
            className={[
              'flex-1 h-10 rounded-md border text-sm font-medium transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              audioRendition === 'forward'
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
            ].join(' ')}
          >
            Forward
          </button>
          <button
            type="button"
            disabled={!reversedAudioAvailable}
            onClick={() => setAudioRendition('reverse')}
            aria-pressed={audioRendition === 'reverse'}
            className={[
              'flex-1 h-10 rounded-md border text-sm font-medium transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              audioRendition === 'reverse'
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
            ].join(' ')}
          >
            Reversed ({reversedClipsCount} available)
          </button>
        </div>
      </section>

      {/* Instruments — NEW */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Instruments
        </h3>
        <p className="text-xs text-ink-muted">
          Play instrumental renditions (no vocals) instead of the original audio.
          {!allowInstruments && (
            <> Not available for this level.</>
          )}
        </p>

        <InstrumentsPicker
          value={allowInstruments ? instruments : 'none'}
          onChange={setInstruments}
          disabled={!allowInstruments}
        />

        <ul className="text-xs text-ink-subtle space-y-0.5 pt-1">
          <li><span className="text-ink-muted">None</span> — hear the original audio (vocals included).</li>
          <li><span className="text-ink-muted">Mixed</span> — half the rounds use instruments (no vocals).</li>
          <li><span className="text-ink-muted">All</span> — every round uses instruments.</li>
        </ul>
      </section>

      {/* Timer */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Timer
        </h3>
        <TimerPicker value={timer} onChange={setTimer} answerMode={answerMode} />
      </section>
    </div>
  );
}