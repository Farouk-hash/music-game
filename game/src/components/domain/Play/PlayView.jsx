import { Loader } from '@/components/ui/Loader.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { RoundHeader } from '@/components/domain/Rounds/RoundHeader.jsx';
import { ProgressBar } from '@/components/domain/Rounds/ProgressBar.jsx';
import { EndScreen } from '@/components/domain/Rounds/EndScreen.jsx';
import { EmptyBlock } from '@/components/domain/Rounds/EmptyBlock.jsx';
import { ErrorBlock } from '@/components/domain/Rounds/ErrorBlock.jsx';
import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';
import { POSITION_LABELS } from '@/constants';
import { RecallScreen } from '../Memory/RecallScreen.jsx';
import { StudyContent } from './StudyContent.jsx';
import { NormalContent } from './NormalContent.jsx';
import { LevelHeader } from './LevelHeader.jsx';

export default function PlayView({
  variant = 'level1',
  isLoading, error, rounds, session, reversal, lifelines,
  totalLifelineCost, onReplay, onSkip, onRemove, onReveal,
  handleReplay, handleSkip, handleRemove, handleReveal, params,
}) {
  const replay = onReplay ?? handleReplay;
  const skip = onSkip ?? handleSkip;
  const remove = onRemove ?? handleRemove;
  const reveal = onReveal ?? handleReveal;

  // Early Returns
  if (isLoading) return <Loader variant="page" label="Preparing rounds…" />;
  if (error) return <ErrorBlock error={error} />;
  if (rounds.length === 0) return <EmptyBlock />;
  
  if (session.recallPhase && !session.finished) {
    return (
      <RecallScreen
        recallItems={session.recallItems}
        onSubmit={session.submitRecall}
        handleFinish={session.finishRecall}
      />
    );
  }

  if (session.finished) {
    return (
      <EndScreen
        score={session.score}
        total={session.totalQuestions}
        lifelineCost={totalLifelineCost}
        onReplay={replay}
      />
    );
  }

  const q = session.currentQuestion;
  if (!q) return <Loader variant="inline" label="Loading…" />;

  const labelFor = (opt) =>
    q.type === 'name-position' ? POSITION_LABELS[opt.value] ?? opt.label : opt.label;

  let revealClip = null;
  if (variant === 'level1') {
    revealClip = session.currentRound?.revealClip;
  } else {
    const isLyricsRound = !!session.currentRound?.lyrics;
    const isLastQ = session.questionIndex + 1 >= session.currentRound.questions.length;
    revealClip = isLyricsRound && isLastQ ? session.currentRound?.revealClip : null;
  }

  const timer = session.hasTimer ? (
    <TimerBar timeLeft={session.timeLeft} total={params.timerSeconds} timedOut={session.timedOut} />
  ) : null;

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
        questionsInRound={session.currentRound?.questions?.length ?? 0}
        questionIndex={session.questionIndex}
        revealed={session.revealed}
        roundScores={session.roundScores}
        recallPhase={session.recallPhase}
      />

      <BorderContainer border="all" className={variant === 'level1' ? 'p-6' : 'p-6 space-y-6'}>
        {variant === 'level1' ? (
          <div className="flex flex-col w-full space-y-6">
            {timer}
            {session.studyMode ? (
              <StudyContent session={session} q={q} reversal={reversal} labelFor={labelFor} />
            ) : (
              <NormalContent 
                variant={variant} session={session} q={q} reversal={reversal} 
                lifelines={lifelines} revealClip={revealClip} labelFor={labelFor} 
                params={params} skip={skip} remove={remove} reveal={reveal} 
              />
            )}
          </div>
        ) : (
          <>
            <LevelHeader session={session} timer={timer} params={params} />
            {session.studyMode ? (
              <StudyContent session={session} q={q} reversal={reversal} labelFor={labelFor} />
            ) : (
              <NormalContent 
                variant={variant} session={session} q={q} reversal={reversal} 
                lifelines={lifelines} revealClip={revealClip} labelFor={labelFor} 
                params={params} skip={skip} remove={remove} reveal={reveal} 
              />
            )}
          </>
        )}
      </BorderContainer>
    </div>
  );
}