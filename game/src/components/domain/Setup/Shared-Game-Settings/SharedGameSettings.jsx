import { useGameSettings } from '@/context/GameSettingsContext.jsx';
import { QuestionTypesSection } from './QuestionTypesSection.jsx';
import { SporcleLevelSection } from './SporcleLevelSection.jsx';
import { AnswerModeSection } from './AnswerModeSection.jsx';
import { RoundCountSection } from './RoundCountSection.jsx';
import { LifelinesSection } from './LifelinesSection.jsx';
import { ReversedAnswersSection } from './ReversedAnswersSection.jsx';
import { ReversedAudioSection } from './ReversedAudioSection.jsx';
import { InstrumentsSection } from './InstrumentsSection.jsx';
import { SporcleModeSection } from './SporcleModeSection.jsx';
import { TimerSection } from './TimerSection.jsx';
import { AutoAdvanceSection } from './AutoAdvanceSection.jsx';
import { MemoryGameSection } from './MemoryGameSection.jsx';

export function SharedGameSettings({
  disabledTypes = new Set(),
  hideRoundCount = false,
  showLifelines: showLifelinesProp,
  reversedClipsCount = 0,
  allowInstruments = true,
  disabledReasons,
  variant = 'default',
  level, setLevel, mode, setMode, autoAdvanceSeconds, setAutoAdvanceSeconds,
  onQuestionTypeUnfavorited,
  value: controlledValue,
  onChange: controlledOnChange,
  readOnly = false,
  isInMultiplayerModal = false,
}) {
  const ctx = useGameSettings();
  const isControlled = controlledValue != null && typeof controlledOnChange === 'function';

  // Exact same state derivation as original
  const questionTypes   = isControlled ? controlledValue.questionTypes   : ctx.questionTypes;
  const answerMode      = isControlled ? controlledValue.answerMode      : ctx.answerMode;
  const roundCount      = isControlled ? controlledValue.roundCount      : ctx.roundCount;
  const reversedAnswers = isControlled ? controlledValue.reversedAnswers : ctx.reversedAnswers;
  const timer           = isControlled ? controlledValue.timer           : ctx.timer;
  const audioRendition  = isControlled ? controlledValue.audioRendition  : ctx.audioRendition;
  const instruments     = isControlled ? controlledValue.instruments     : ctx.instruments;
  const memoryGame      = isControlled ? controlledValue.memoryGame      : ctx.memoryGame;
  const multiplayerMode = isControlled ? controlledValue.multiplayerMode : ctx.multiplayerMode;
  const skips           = isControlled ? (controlledValue.skips   ?? 0) : (ctx.skips   ?? 0);
  const removes         = isControlled ? (controlledValue.removes ?? 0) : (ctx.removes ?? 0);
  const reveals         = isControlled ? (controlledValue.reveals ?? 0) : (ctx.reveals ?? 0);

  // Exact same universal writer abstraction
  const write = (key, val) => {
    if (readOnly) return;
    if (isControlled) {
      controlledOnChange({ ...controlledValue, [key]: val });
    } else {
      const setterName = 'set' + key[0].toUpperCase() + key.slice(1);
      ctx[setterName](val);
    }
  };

  const setters = {
    setQuestionTypes:   (v) => write('questionTypes', v),
    setAnswerMode:      (v) => write('answerMode', v),
    setRoundCount:      (v) => write('roundCount', v),
    setReversedAnswers: (v) => write('reversedAnswers', v),
    setTimer:           (v) => write('timer', v),
    setAudioRendition:  (v) => write('audioRendition', v),
    setInstruments:     (v) => write('instruments', v),
    setSkips:           (v) => write('skips', v),
    setRemoves:         (v) => write('removes', v),
    setReveals:         (v) => write('reveals', v),
    setMemoryGame:      (v) => write('memoryGame', v),
    setMultiplayerMode: (v) => {
      if (readOnly) return;
      if (isControlled) controlledOnChange({ ...controlledValue, multiplayerMode: v });
      else ctx.setMultiplayerMode(v);
    },
  };

  const isSporcle = variant === 'sporcle';
  const showLifelines = showLifelinesProp !== false && !isSporcle && !hideRoundCount;

  return (
    <div className={`space-y-6 ${readOnly ? 'pointer-events-none opacity-80 select-none' : ''}`}>
      <QuestionTypesSection
        value={questionTypes}
        onChange={setters.setQuestionTypes}
        disabledTypes={disabledTypes}
        disabledReasons={disabledReasons}
        onUnfavorited={readOnly ? undefined : onQuestionTypeUnfavorited}
        readOnly={readOnly}
      />

      {isSporcle && (
        <SporcleLevelSection
          level={level}
          setLevel={setLevel}
          readOnly={readOnly}
        />
      )}

      <AnswerModeSection
        value={answerMode}
        onChange={setters.setAnswerMode}
        readOnly={readOnly}
      />

      {!hideRoundCount && (
        <RoundCountSection
          value={roundCount}
          onChange={setters.setRoundCount}
          isSporcle={isSporcle}
          readOnly={readOnly}
        />
      )}

      {showLifelines && (
        <LifelinesSection
          skips={skips}
          removes={removes}
          reveals={reveals}
          roundCount={roundCount}
          setSkips={setters.setSkips}
          setRemoves={setters.setRemoves}
          setReveals={setters.setReveals}
          readOnly={readOnly}
        />
      )}

      <ReversedAnswersSection
        value={reversedAnswers}
        onChange={setters.setReversedAnswers}
        readOnly={readOnly}
      />

      <ReversedAudioSection
        value={audioRendition}
        onChange={setters.setAudioRendition}
        reversedClipsCount={reversedClipsCount}
        readOnly={readOnly}
      />

      <InstrumentsSection
        value={instruments}
        onChange={setters.setInstruments}
        allowInstruments={allowInstruments}
        readOnly={readOnly}
      />

      {isSporcle && (
        <SporcleModeSection
          mode={mode}
          setMode={setMode}
          readOnly={readOnly}
        />
      )}

      <TimerSection
        value={timer}
        onChange={setters.setTimer}
        readOnly={readOnly}
      />

      {isSporcle && (
        <AutoAdvanceSection
          value={autoAdvanceSeconds}
          onChange={setAutoAdvanceSeconds}
          readOnly={readOnly}
        />
      )}

      {!isInMultiplayerModal && (
        <MemoryGameSection
          value={memoryGame}
          onChange={setters.setMemoryGame}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}