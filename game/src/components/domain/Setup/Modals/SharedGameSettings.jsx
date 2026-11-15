// game/src/components/domain/Setup/Modals/SharedGameSettings.jsx
import { QuestionTypePicker } from '../QuestionTypePicker/QuestionTypePicker.jsx';
import { AnswerModePicker } from '../AnswerModePicker/AnswerModePicker.jsx';
import { RoundCountPicker } from '../RoundCountPicker/RoundCountPicker.jsx';
import { ReversedAnswersPicker } from '../ReversedAnswersPicker/ReversedAnswersPicker.jsx';
import { TimerPicker } from '../Timer/TimerPicker.jsx';
import { InstrumentsPicker } from '../Instruments/InstrumentsPicker.jsx';
import { useGameSettings } from '@/context/GameSettingsContext.jsx';
import { ChoiceCard } from './ChoiceCard.jsx';
import { Reveal } from '@/components/ui/Reveal.jsx'; 
import { ReversedAudioPicker } from '../ReversedAudioPicker/ReversedAudioPicker.jsx';

export function SharedGameSettings({
  disabledTypes = new Set(),
  hideRoundCount = false,
  reversedClipsCount = 0,
  allowInstruments = true,
  disabledReasons,   
  variant = 'default',
  level, setLevel, mode, setMode, autoAdvanceSeconds, setAutoAdvanceSeconds,
  onQuestionTypeUnfavorited,
  value: controlledValue,
  onChange: controlledOnChange,
  readOnly = false,
}) {
  const ctx = useGameSettings();
  const isControlled = controlledValue != null && typeof controlledOnChange === 'function';

  const questionTypes   = isControlled ? controlledValue.questionTypes   : ctx.questionTypes;
  const answerMode      = isControlled ? controlledValue.answerMode      : ctx.answerMode;
  const roundCount      = isControlled ? controlledValue.roundCount      : ctx.roundCount;
  const reversedAnswers = isControlled ? controlledValue.reversedAnswers : ctx.reversedAnswers;
  const timer           = isControlled ? controlledValue.timer           : ctx.timer;
  const audioRendition  = isControlled ? controlledValue.audioRendition  : ctx.audioRendition;
  const instruments     = isControlled ? controlledValue.instruments     : ctx.instruments;

  const write = (key, val) => {
    if (readOnly) return;
    if (isControlled) {
      controlledOnChange({ ...controlledValue, [key]: val });
    } else {
      const setterName = 'set' + key[0].toUpperCase() + key.slice(1);
      ctx[setterName](val);
    }
  };

  const setQuestionTypes   = (v) => write('questionTypes', v);
  const setAnswerMode      = (v) => write('answerMode', v);
  const setRoundCount      = (v) => write('roundCount', v);
  const setReversedAnswers = (v) => write('reversedAnswers', v);
  const setTimer           = (v) => write('timer', v);
  const setAudioRendition  = (v) => write('audioRendition', v);
  const setInstruments     = (v) => write('instruments', v);

  const reversedAudioAvailable = reversedClipsCount > 0;
  const isSporcle = variant === 'sporcle';

  return (
      <div className={`space-y-6 ${readOnly ? 'pointer-events-none opacity-80 select-none' : ''}`}>
        
        {/* Question types */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Question types
          </h3>
          <QuestionTypePicker
            onUnfavorited={readOnly ? undefined : onQuestionTypeUnfavorited}
            value={questionTypes}
            onChange={setQuestionTypes}
            disabledTypes={disabledTypes}
            disabledReasons={disabledReasons}
            disabled={readOnly}
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
                onClick={readOnly ? undefined : () => setLevel(1)}
                title="Level 1"
                description="One question per clip."
                disabled={readOnly}
              />
              <ChoiceCard
                active={level === 2}
                onClick={readOnly ? undefined : () => setLevel(2)}
                title="Level 2"
                description="Multiple questions per clip."
                disabled={readOnly}
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
          <AnswerModePicker value={answerMode} onChange={setAnswerMode} disabled={readOnly} />
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
                <span> Level 2 returns several questions per clip.</span>
              )}
            </p>
            <RoundCountPicker value={roundCount} onChange={setRoundCount} disabled={readOnly} />
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
          <ReversedAnswersPicker value={reversedAnswers} onChange={setReversedAnswers} disabled={readOnly} />
        </section>

       <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Reversed audio
          </h3>
          <p className="text-xs text-ink-muted">
            Play the clip backwards instead of forwards.
            {reversedClipsCount === 0 && (
              <span> No reversed renditions available yet.</span>
            )}
          </p>

          <ReversedAudioPicker
            value={audioRendition} 
            onChange={setAudioRendition} 
            disabled={readOnly} 
            reversedClipsCount={reversedClipsCount} 
          />
        </section>

        {/* Instruments */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Instruments
          </h3>
          <p className="text-xs text-ink-muted">
            Play instrumental renditions (no vocals) instead of the original audio.
            {!allowInstruments && <span> Not available for this level.</span>}
          </p>

          <InstrumentsPicker
            value={instruments}
            onChange={setInstruments}
            disabled={!allowInstruments || readOnly}
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
                onClick={readOnly ? undefined : () => setMode('speed')}
                title="Speed"
                description="First correct answer wins the point. Question ends immediately."
                disabled={readOnly}
              />
              <ChoiceCard
                active={mode === 'collect'}
                onClick={readOnly ? undefined : () => setMode('collect')}
                title="Collect"
                description="Everyone answers. Each correct answer earns a point."
                disabled={readOnly}
              />
            </div>
          </section>
        )}

        {/* Timer */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Timer
          </h3>
          <TimerPicker value={timer} onChange={setTimer}  disabled={readOnly} />
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
              disabled={readOnly}
              onChange={(e) => setAutoAdvanceSeconds(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
              className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none disabled:opacity-50"
            />
          </section>
        )}
      </div>
   
  );
}