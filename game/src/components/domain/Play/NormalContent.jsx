import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { AudioPlayer } from '@/components/domain/Rounds/AudioPlayer.jsx';

export function NormalContent({ 
  variant, session, q, reversal, lifelines, revealClip, 
  labelFor, params, skip, remove, reveal 
}) {
  return (
    <div className="space-y-4">
      {/* ✅ Level 1 Audio Fix: Render source BEFORE card */}
      {variant === 'level1' && session.currentRound?.clip && (
        <PromptSource round={session.currentRound} />
      )}
      
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
        onLifelineSkip={skip}
        onLifelineRemove={remove}
        onLifelineReveal={reveal}
        hiddenOptionValue={session.currentHiddenOption}
      />
    </div>
  );
}