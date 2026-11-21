// game/src/routes/Play3.jsx
import { useState, useRef } from 'react';
import { usePlayParams } from '@/hooks/rounds/usePlayParams.js';
import { useRoundSet } from '@/hooks/rounds/useRoundSet.js';
import { useGameEngineL3 } from '@/hooks/rounds/useGameEngineL3.js';
import { Button } from '@/components/ui/Button.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer';
import { MultiClipPlayer } from '@/components/domain/MultiTracks/MutliClipPlay.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { RevealedTracks } from '@/components/domain/MultiTracks/RevealedTracks.jsx';
import { RoundHeader } from '@/components/domain/Rounds/RoundHeader.jsx';
import { ProgressBar } from '@/components/domain/Rounds/ProgressBar.jsx';
import { EndScreen } from '@/components/domain/Rounds/EndScreen.jsx';
import { EmptyBlock } from '@/components/domain/Rounds/EmptyBlock.jsx';
import { ErrorBlock } from '@/components/domain/Rounds/ErrorBlock.jsx';

const TYPING_ALLOWED = new Set(['how-many-in-mix']);

export default function Play3() {
  const params = usePlayParams();
  const engine = useGameEngineL3(useRoundSet, params);
  const { session, lifelines, totalLifelineCost, handleReplay, rounds: sets } = engine;

  // Level 3 specific state
  const [revealOpen, setRevealOpen] = useState(false);
  const [phase, setPhase] = useState('listen');

  const mixRef = useRef(null);
  const currentSet = sets[session.roundIndex];
  const currentQuestion = currentSet?.questions[session.questionIndex];
  
  const isLastQuestionInSet = currentSet && session.questionIndex + 1 >= currentSet.questions.length;
  const isLastSet = session.roundIndex + 1 >= sets.length;
  const isLastQuestionOverall = isLastQuestionInSet && isLastSet;

  function startQuestions() {
    setPhase('questions');
  }

  // ✅ Use session.pick directly. It handles scoring and state updates.
  function pick(value, overrideCorrect) {
    if (session.revealed) return;
    session.pick(value, overrideCorrect);
  }

  // ✅ Advance to next question/set. 
  // session.next() ALREADY resets picked, revealed, and timedOut internally.
  function advance() {
    if (!isLastQuestionInSet) {
      session.next(); 
    } else if (!isLastSet) {
      session.next(); // Moves to next set
      setPhase('listen');
      setRevealOpen(false);
    } else {
      // If it's the very last question, session.next() will set finished=true.
      session.next();
    }
  }

  function handleSkip() {
    if (!lifelines.canSkip) return;
    lifelines.useSkip();
    
    // session.skip() marks the question as skipped and updates scores.
    // We still need to call advance() to move the UI forward.
    session.skip();
    advance();
  }

  function handleRemove() {
    // Guard: one remove per question using session's built-in guard
    if (!lifelines.canRemove || session.revealed || session.alreadyRemovedHere) return;
    
    const wrongOptions = currentQuestion.options.filter(o => o.value !== currentQuestion.correctValue);
    if (wrongOptions.length === 0) return;
    
    const pick = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    
    // session.hideOption tracks cost and prevents double-remove for this question index
    session.hideOption(pick.value);
  }

  function handleReveal() {
    if (!lifelines.canReveal || session.revealed) return;
    
    // session.revealAnswer marks as revealed, deducts cost, and sets picked to correct value
    session.revealAnswer();
  }

  if (engine.isLoading) {
    return (
      <BorderContainer border="all" className="p-8">
        <Loader variant="page" label="Preparing mixes…" />
      </BorderContainer>
    );
  }
  if (engine.error) return <ErrorBlock error={engine.error} />;
  if (sets.length === 0) return <EmptyBlock />;
  
  if (session.finished) {
    return (
      <EndScreen
        score={session.score}
        total={session.totalQuestions}
        lifelineCost={totalLifelineCost}
        onReplay={async () => {
          await handleReplay();
          setPhase('listen');
          setRevealOpen(false);
        }}
      />
    );
  }

  const q = currentQuestion;
  const useTyping = params.answerMode === 'type' && TYPING_ALLOWED.has(q?.type);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ✅ Unified Header & Progress Bar */}
      <RoundHeader
        roundNumber={session.roundNumber}
        totalRounds={session.totalRounds}
        questionNumber={session.questionNumber}
        totalQuestions={session.totalQuestions}
        score={session.score}
        showQuestionCounter
      />
      
      <ProgressBar
        totalRounds={session.totalRounds}
        roundIndex={session.roundIndex}
        questionsInRound={currentSet?.questions?.length || 0}
        questionIndex={session.questionIndex}
        revealed={session.revealed}
        roundScores={session.roundScores}
      />

      {/* ✅ Unique Level 3 Layout */}
      <BorderContainer border="all" className={phase === 'listen' ? 'p-6 space-y-6' : 'p-3'}>
        {phase === 'listen' ? (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">The Mix</p>
              <h2 className="text-xl font-bold text-ink leading-snug">{currentSet.clips.length} tracks are about to play together.</h2>
              <p className="text-sm text-ink-muted">Listen to the blend. Every question is about the mix as a whole — you won't be able to isolate a single track.</p>
            </div>
            <MultiClipPlayer ref={mixRef} clips={currentSet.clips} compact={false} />
            <div className="flex justify-end pt-2">
              <Button onClick={startQuestions} variant="primary">I'm ready →</Button>
            </div>
          </>
        ) : (
          <MultiClipPlayer ref={mixRef} clips={currentSet.clips} compact={true} />
        )}
      </BorderContainer>

      {phase === 'questions' && (
        <>
          <BorderContainer border="all" className="p-6 space-y-6">
            <QuestionCard
              eyebrow={q.type.replace('name-', '').replace('lyrics-', '')}
              prompt={q.prompt}
              options={q.options}
              correctValue={q.correctValue}
              picked={session.picked}
              revealed={session.revealed}
              onPick={pick}
              onNext={advance} // ✅ Uses the unified advance function
              nextLabel={isLastQuestionOverall ? 'See results' : 'Next →'}
              answerMode={params.answerMode}
              questionType={q.type}
              lifelines={lifelines}
              onLifelineSkip={handleSkip}
              onLifelineRemove={handleRemove}
              onLifelineReveal={handleReveal}
              hiddenOptionValue={session.currentHiddenOption}
            />
          </BorderContainer>

          {session.revealed && isLastQuestionInSet && (
            <BorderContainer border="all" className="p-4 space-y-3">
              <button
                type="button"
                onClick={() => setRevealOpen(o => !o)}
                className="w-full flex items-center justify-between text-sm font-medium text-highlight hover:text-accent transition-colors"
              >
                <span>{revealOpen ? '▾' : '▸'} Reveal the tracks ({currentSet.clips.length})</span>
                <span className="text-xs text-ink-subtle font-normal">Listen to each track on its own</span>
              </button>
              {revealOpen && <RevealedTracks clips={currentSet.clips} />}
            </BorderContainer>
          )}
        </>
      )}
    </div>
  );
}