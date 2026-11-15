// game/src/routes/Streak/ChallengePlay.jsx
import { Button } from '@/components/ui/Button.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

export function ChallengePlay({
  mode,
  allBatches,
  batchIndex,
  questionIndex,
  totalBatches,
  picked,
  revealed,
  easyMode,
  timeLeft,
  timedOut,
  batchTimerSeconds,
  currentBatch,
  currentQuestion,
  onAnswer,
  onNext,
  onResetPreview,
}) {
  if (!currentBatch || !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen pt-16 text-center space-y-4">
        <p className="text-wrong">Failed to load questions.</p>
        <Button onClick={onResetPreview}>Try again</Button>
      </div>
    );
  }

  const isLastQuestionInBatch =
    questionIndex + 1 >= currentBatch.questions.length;
  const isLastBatch = batchIndex + 1 >= totalBatches;

  const modeIcon =
    currentBatch.instruments !== 'none' ? '🎼' :
    currentBatch.rendition === 'reverse' ? '🔄' :
    '';

  const labelFor = (opt) =>
    currentQuestion.type === 'name-position'
      ? POSITION_LABELS[opt.value] ?? opt.label
      : opt.label;

  const reversal = currentBatch.reversed === 'all'
    ? { reversed: true, style: 'letters' }
    : currentBatch.reversed === 'some'
      ? { reversed: true, style: 'words' }
      : { reversed: false, style: null };

  return (
    <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen">
      <div className="space-y-4 pt-4">

        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-subtle uppercase tracking-[0.15em]">
            {mode === 'daily' ? '🔥 Daily' : '⚡ Power'}
            {modeIcon && <span className="ml-2">{modeIcon}</span>}
            {easyMode && <span className="ml-2 text-accent-2">🎯</span>}
          </span>
          <span className="text-ink-subtle">
            Batch {batchIndex + 1} / {totalBatches}
          </span>
        </div>

        <div className="flex items-center justify-center gap-1 flex-wrap">
          {Array.from({ length: totalBatches }).map((_, i) => (
            <span
              key={i}
              className={[
                'h-2 rounded-full transition-colors',
                totalBatches > 8 ? 'w-5' : 'w-8',
                i < batchIndex ? 'bg-correct' :
                i === batchIndex ? 'bg-accent' :
                'bg-surface-2',
              ].join(' ')}
            />
          ))}
        </div>

        <p className="text-center text-xs text-ink-subtle">
          Question {questionIndex + 1} of {currentBatch.questions.length}
        </p>

        <TimerBar
          timeLeft={timeLeft}
          total={batchTimerSeconds}
          timedOut={timedOut}
        />

        <PromptSource round={currentBatch} />

        <BorderContainer border="all" className="p-4 sm:p-6">
          <QuestionCard
            eyebrow={currentQuestion.type.replace('name-', '').replace('lyrics-', '')}
            prompt={currentQuestion.prompt}
            options={currentQuestion.options}
            correctValue={currentQuestion.correctValue}
            picked={picked}
            revealed={revealed}
            onPick={onAnswer}
            onNext={onNext}
            nextLabel={
              !isLastQuestionInBatch ? 'Next question' :
              !isLastBatch ? 'Next batch' :
              'Submit'
            }
            labelFor={labelFor}
            answerMode={currentBatch.answerMode ?? 'choose'}
            questionType={currentQuestion.type}
            source={currentBatch.source}
            reversal={reversal}
          />
        </BorderContainer>

      </div>
    </div>
  );
}