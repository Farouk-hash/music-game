import { Button } from '@/components/ui/Button.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';
import { POSITION_LABELS } from '@/constants';

export function HotPotatoPlayingView({ session, params, reversal }) {
  const q = session.currentRound;
  const labelFor = (opt) =>
    q.type === 'name-position' ? POSITION_LABELS[opt.value] ?? opt.label : opt.label;

  const answered = session.picked != null;
  const isMultiQTrack = session.currentTrack?.length > 1;

  // Dynamic next button label based on exact state
  let nextLabel = 'Next Question →';
  if (session.isLastQuestionInTrack && !session.isLastPlayer) {
    const nextPlayerName = params.players[(session.currentPlayerIndex + 1) % params.players.length];
    nextLabel = `Pass to ${nextPlayerName} →`;
  } else if (session.isLastQuestionInTrack && session.isLastPlayer && !session.isLastTrack) {
    nextLabel = 'Next Track →';
  } else if (session.isLastQuestionInTrack && session.isLastPlayer && session.isLastTrack) {
    nextLabel = 'Reveal All →';
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header with Player Badge & Progress */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-xs text-ink-subtle tabular-nums">
          Track {session.trackIndex + 1} / {session.totalTracks}
          {isMultiQTrack && (
            <span className="ml-2 text-accent">
              · Q{session.questionInTrackIndex + 1}/{session.currentTrack.length}
            </span>
          )}
        </span>
      </div>

      <BorderContainer border="all" className="p-6 space-y-6">
        {/* Multi-question track header */}
        {isMultiQTrack && (
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <span className="text-[10px] font-bold text-highlight uppercase tracking-[0.15em]">
              🎵 Same Track · {session.currentTrack.length} Questions
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
        )}

        {session.hasTimer && (
          <TimerBar timeLeft={session.timeLeft} total={params.timerSeconds} timedOut={session.timedOut} />
        )}

        <PromptSource round={q} />

        <QuestionCard
          eyebrow={q.type.replace('name-', '').replace('lyrics-', '')}
          prompt={q.prompt}
          options={q.options}
          correctValue={q.correctValue}
          picked={session.picked}
          revealed={false}
          onPick={session.pick}
          showNextButton={false}
          disabled={answered}
          labelFor={labelFor}
          answerMode={params.answerMode}
          questionType={q.type}
          source={q.source}
          reversal={reversal}
          revealExtra={null}
        />

        {/* Feedback Messages */}
        {session.timedOut && (
          <p className="text-wrong text-sm">⏱ Time's up — no answer was recorded.</p>
        )}
        {answered && !session.timedOut && (
          <p className="text-ink-muted text-sm">✅ Answer locked in. Results are revealed at the end.</p>
        )}

        {/* Next Action Button */}
        {answered && (
          <div className="flex justify-end pt-2">
            <Button onClick={session.next}>{nextLabel}</Button>
          </div>
        )}
      </BorderContainer>
    </div>
  );
}