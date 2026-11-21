// game/src/components/domain/Play/PlayView.jsx
import { Loader } from '@/components/ui/Loader.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { AudioPlayer } from '@/components/domain/Rounds/AudioPlayer.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { RoundHeader } from '@/components/domain/Rounds/RoundHeader.jsx';
import { ProgressBar } from '@/components/domain/Rounds/ProgressBar.jsx';
import { EndScreen } from '@/components/domain/Rounds/EndScreen.jsx';
import { EmptyBlock } from '@/components/domain/Rounds/EmptyBlock.jsx';
import { ErrorBlock } from '@/components/domain/Rounds/ErrorBlock.jsx';
import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';
import { POSITION_LABELS } from '@/constants';


export default function PlayView({ 
  variant = 'level1', // 'level1' | 'level2' | 'level3'
  isLoading,
  error,
  rounds,
  session,
  reversal,
  lifelines,
  totalLifelineCost,
  onReplay,
  onSkip,
  onRemove,
  onReveal,
  params 
}) {
  if (isLoading) {
    return (
      <BorderContainer border="all" className="p-8">
        <Loader variant="page" label="Preparing rounds…" />
      </BorderContainer>
    );
  }

  if (error) return <ErrorBlock error={error} />;
  if (rounds.length === 0) return <EmptyBlock />;

  if (session.finished) {
    return (
      <EndScreen
        score={session.score}
        total={session.totalQuestions}
        lifelineCost={totalLifelineCost}
        onReplay={onReplay}
      />
    );
  }

  const q = session.currentQuestion;
  const labelFor = (opt) =>
    q.type === 'name-position'
      ? POSITION_LABELS[opt.value] ?? opt.label
      : opt.label;

  // Difference: Reveal Clip Logic
  let revealClip = null;
  if (variant === 'level1') {
    revealClip = session.currentRound?.revealClip;
  } else {
    const isLyricsRound = !!session.currentRound?.lyrics;
    const isLastQuestionInRound = session.questionIndex + 1 >= session.currentRound.questions.length;
    revealClip = isLyricsRound && isLastQuestionInRound ? session.currentRound?.revealClip : null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <RoundHeader
        roundNumber={session.roundNumber}
        totalRounds={session.totalRounds}
        questionNumber={variant !== 'level1' ? session.questionNumber : undefined}
        totalQuestions={variant !== 'level1' ? session.totalQuestions : undefined}
        score={session.score}
        showQuestionCounter={variant !== 'level1'}
      />
      <ProgressBar
        totalRounds={session.totalRounds}
        roundIndex={session.roundIndex}
        questionsInRound={session.currentRound.questions.length}
        questionIndex={session.questionIndex}
        revealed={session.revealed}
        roundScores={session.roundScores}
      />

      <BorderContainer border="all" className={variant === 'level1' ? 'p-6' : 'p-6 space-y-6'}>
        {variant === 'level1' ? (
          // Level 1 Layout: Vertical Stack
          <div className="flex flex-col w-full space-y-6">
            {session.hasTimer && (
              <TimerBar timeLeft={session.timeLeft} total={params.timerSeconds} timedOut={session.timedOut} />
            )}
            <div className="w-full">
              <PromptSource round={session.currentRound} />
            </div>
            <div className="w-full">
              <QuestionCard
                eyebrow={q.type.replace('name-', '').replace('lyrics-', '')}
                prompt={q.prompt}
                options={q.options}
                correctValue={q.correctValue}
                picked={session.picked}
                revealed={session.revealed}
                onPick={session.pick}
                onNext={session.next}
                nextLabel={session.isLastQuestionOverall ? 'See results' : 'Next →'}
                labelFor={labelFor}
                answerMode={params.answerMode}
                questionType={q.type}
                source={session.currentRound?.source}
                reversal={reversal}
                revealExtra={revealClip ? <AudioPlayer src={revealClip.serveUrl} /> : null}
                lifelines={lifelines}
                onLifelineSkip={onSkip}
                onLifelineRemove={onRemove}
                onLifelineReveal={onReveal}
                hiddenOptionValue={session.currentHiddenOption}
              />
            </div>
          </div>
        ) : (
          // Level 2/3 Layout: Horizontal Top Bar
          <>
            <div className="flex items-center gap-4">
              {session.hasTimer && (
                <TimerBar timeLeft={session.timeLeft} total={params.timerSeconds} timedOut={session.timedOut} />
              )}
              <PromptSource round={session.currentRound} />
              <div className="flex-1">
                <p className="text-sm text-ink-muted">
                  {session.currentRound.questions.length > 1
                    ? 'Listen carefully — there is more than one question about this clip.'
                    : 'Answer the question below.'}
                </p>
              </div>
            </div>
            
            <QuestionCard
              eyebrow={q.type.replace('name-', '').replace('lyrics-', '')}
              prompt={q.prompt}
              options={q.options}
              correctValue={q.correctValue}
              picked={session.picked}
              revealed={session.revealed}
              onPick={session.pick}
              onNext={session.next}
              nextLabel={session.isLastQuestionOverall ? 'See results' : 'Next →'}
              labelFor={labelFor}
              answerMode={params.answerMode}
              questionType={q.type}
              source={session.currentRound?.source}
              reversal={reversal}
              revealExtra={revealClip ? <AudioPlayer src={revealClip.serveUrl} /> : null}
              lifelines={lifelines}
              onLifelineSkip={onSkip}
              onLifelineRemove={onRemove}
              onLifelineReveal={onReveal}
              hiddenOptionValue={session.currentHiddenOption}
            />
          </>
        )}
      </BorderContainer>
    </div>
  );
}