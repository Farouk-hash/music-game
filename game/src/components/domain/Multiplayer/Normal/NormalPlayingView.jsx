import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { AudioPlayer } from '@/components/domain/Rounds/AudioPlayer.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';
import { MultiplayerProgress } from './MultiplayerProgress';
import { POSITION_LABELS } from '@/constants';

export function NormalPlayingView({ session, params, reversal }) {
  const q = session.currentQuestion;
  const labelFor = (opt) =>
    q.type === 'name-position' ? POSITION_LABELS[opt.value] ?? opt.label : opt.label;

  const revealClip = session.currentRound?.revealClip;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-xs text-ink-subtle tabular-nums">
          Round {session.roundNumber} / {session.totalRounds}
        </span>
      </div>

      {/* Progress Bar */}
      <MultiplayerProgress
        players={params.players}
        scores={session.scores}
        roundScores={session.roundScores}
        totalRounds={session.totalRounds}
        roundIndex={session.roundIndex}
        currentPlayerIndex={session.currentPlayerIndex}
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
          nextLabel={session.isLastQuestionOverall ? 'See final scores' : 'Next →'}
          labelFor={labelFor}
          answerMode={params.answerMode}
          questionType={q.type}
          source={session.currentRound?.source}
          reversal={reversal}
          revealExtra={revealClip ? <AudioPlayer src={revealClip.serveUrl} /> : null}
        />
      </BorderContainer>
    </div>
  );
}