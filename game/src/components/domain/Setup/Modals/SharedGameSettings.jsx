// game/src/components/domain/Setup/Modals/SharedGameSettings.jsx
import { QuestionTypePicker } from '../QuestionTypePicker/QuestionTypePicker.jsx';
import { AnswerModePicker } from '../AnswerModePicker/AnswerModePicker.jsx';
import { RoundCountPicker } from '../RoundCountPicker/RoundCountPicker.jsx';
import { ReversedAnswersPicker } from '../ReversedAnswersPicker/ReversedAnswersPicker.jsx';
import { TimerPicker } from '../Timer/TimerPicker.jsx';
import { InstrumentsPicker } from '../Instruments/InstrumentsPicker.jsx';
import { useGameSettings } from '../../../../context/GameSettingsContext.jsx';

/**
 * Shared game-settings block embedded in every modal.
 *
 * `variant="default"` — solo/co-op/multiplayer (existing behaviour).
 * `variant="sporcle"` — adds Level, Mode, and Auto-advance controls.
 *                       Consumed by SporcleModal.
 */
export function SharedGameSettings({
  disabledTypes = new Set(),
  hideRoundCount = false,
  reversedClipsCount = 0,
  allowInstruments = true,
  variant = 'default',
  // Sporcle-only controlled props (only used when variant === 'sporcle')
  level,
  setLevel,
  mode,
  setMode,
  autoAdvanceSeconds,
  setAutoAdvanceSeconds,
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
  const isSporcle = variant === 'sporcle';

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

      {/* Level (Sporcle only) */}
      {isSporcle && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Level
          </h3>
          <p className="text-xs text-ink-muted">
            How many questions you get from each clip.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard
              active={level === 1}
              onClick={() => setLevel(1)}
              title="Level 1"
              description="One question per clip."
            />
            <ChoiceCard
              active={level === 2}
              onClick={() => setLevel(2)}
              title="Level 2"
              description="Multiple questions per clip."
            />
          </div>
        </section>
      )}

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
            {isSporcle && (
              <> Level 2 returns several questions per clip.</>
            )}
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

      {/* Instruments */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Instruments
        </h3>
        <p className="text-xs text-ink-muted">
          Play instrumental renditions (no vocals) instead of the original audio.
          {!allowInstruments && <> Not available for this level.</>}
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

      {/* Mode (Sporcle only) */}
      {isSporcle && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Game mode
          </h3>
          <p className="text-xs text-ink-muted">
            How scoring works.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard
              active={mode === 'speed'}
              onClick={() => setMode('speed')}
              title="Speed"
              description="First correct answer wins the point. Question ends immediately."
            />
            <ChoiceCard
              active={mode === 'collect'}
              onClick={() => setMode('collect')}
              title="Collect"
              description="Everyone answers. Each correct answer earns a point."
            />
          </div>
        </section>
      )}

      {/* Timer */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Timer
        </h3>
        <TimerPicker value={timer} onChange={setTimer} answerMode={answerMode} />
      </section>

      {/* Auto-advance (Sporcle only) */}
      {isSporcle && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Auto-advance
          </h3>
          <p className="text-xs text-ink-muted">
            Seconds after reveal before the next question. 0 = host advances manually.
          </p>
          <input
            type="number"
            min={0}
            max={30}
            value={autoAdvanceSeconds}
            onChange={(e) => setAutoAdvanceSeconds(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
            className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
          />
        </section>
      )}
    </div>
  );
}

function ChoiceCard({ active, onClick, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'text-left p-4 rounded-md border transition-colors space-y-1',
        active
          ? 'bg-accent-soft border-accent text-ink'
          : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2',
      ].join(' ')}
    >
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs">{description}</p>
    </button>
  );
}