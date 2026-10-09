// game/src/routes/Play.jsx
import { usePlayParams } from '../hooks/usePlayParams.js';
import { useRound } from '../hooks/useRound.js';
import { usePlaySession } from '../hooks/usePlaySession.js';
import { Loader } from '../components/ui/Loader.jsx';
import { BorderContainer } from '../components/layout/BorderContainer.jsx';
import { PromptSource } from '../components/domain/Rounds/PromptSource.jsx';
import { AudioPlayer } from '../components/domain/Rounds/AudioPlayer.jsx';
import { QuestionCard } from '../components/domain/Rounds/QuestionCard.jsx';
import { RoundHeader } from '../components/domain/Rounds/RoundHeader.jsx';
import { ProgressBar } from '../components/domain/Rounds/ProgressBar.jsx';
import { EndScreen } from '../components/domain/Rounds/EndScreen.jsx';
import { EmptyBlock } from '../components/domain/Rounds/EmptyBlock.jsx';
import { ErrorBlock } from '../components/domain/Rounds/ErrorBlock.jsx';
import { TimerBar } from '../components/domain/Setup/Timer/Timerbar.jsx';
import { useRoundReversal } from '../hooks/useRoundReversal.js';

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

function normalizeRounds(rounds) {
  return rounds.map((r) => ({
    clip: r.clip,
    lyrics: r.lyrics,
    revealClip: r.revealClip,
    questions: [{
      type: r.type,
      prompt: r.question.prompt,
      options: r.question.options,
      correctValue: r.question.correctValue,
    }],
  }));
}

export default function Play() {
  const params = usePlayParams();
  const { data, isLoading, error } = useRound(params);
  const rounds = normalizeRounds(data?.rounds ?? []);

  const session = usePlaySession(rounds, { timerSeconds: params.timerSeconds });
  const reversal = useRoundReversal(params.reversed, session.roundIndex);

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
        onReplay={() => window.location.reload()}
      />
    );
  }

  const q = session.currentQuestion;
  const labelFor = (opt) =>
    q.type === 'name-position'
      ? POSITION_LABELS[opt.value] ?? opt.label
      : opt.label;

  const revealClip = session.currentRound?.revealClip;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <RoundHeader
        roundNumber={session.roundNumber}
        totalRounds={session.totalRounds}
        score={session.score}
      />
      <ProgressBar
        totalRounds={session.totalRounds}
        roundIndex={session.roundIndex}
        questionsInRound={session.currentRound.questions.length}
        questionIndex={session.questionIndex}
        revealed={session.revealed}
        roundScores={session.roundScores}
      />

      <BorderContainer border="all" className="p-6 space-y-6">
        {session.hasTimer && (
          <TimerBar
            timeLeft={session.timeLeft}
            total={params.timerSeconds}
            timedOut={session.timedOut}
          />
        )}

        <PromptSource round={session.currentRound} />

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
          reversal={reversal}
          revealExtra={revealClip ? <AudioPlayer src={revealClip.serveUrl} /> : null}
        />
      </BorderContainer>
    </div>
  );
}