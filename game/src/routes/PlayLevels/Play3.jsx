// game/src/routes/Play3.jsx
import { useState, useRef } from 'react';
import { usePlayParams } from '../../hooks/rounds/usePlayParams.js';
import { useRoundSet } from '../../hooks/rounds/useRoundSet.js';
import { isAnswerCorrect } from '../../hooks/rounds/answerCheck.js';
import { storage } from '../../lib/storage.js';
import { Button } from '../../components/ui/Button.jsx';
import { Loader } from '../../components/ui/Loader.jsx';
import { BorderContainer } from '../../components/layout/BorderContainer.jsx';
import { MultiClipPlayer } from '../../components/domain/MultiTracks/MutliClipPlay.jsx';
import { OptionsGrid } from '../../components/domain/Rounds/OptionsGrid.jsx';
import { TextAnswerInput } from '../../components/domain/TextAnswerInput/TextAnswerInput.jsx';
import { EndScreen } from '../../components/domain/Rounds/EndScreen.jsx';
import { EmptyBlock } from '../../components/domain/Rounds/EmptyBlock.jsx';
import { ErrorBlock } from '../../components/domain/Rounds/ErrorBlock.jsx';
import { RevealedTracks } from '../../components/domain/MultiTracks/RevealedTracks.jsx';

// Question types that always render as buttons, regardless of answer mode.
// These have small fixed option sets — typing them is silly.
const TYPING_ALLOWED = new Set([
  'how-many-in-mix',
]);

export default function Play3() {
  const params = usePlayParams();
  const { data, isLoading, error } = useRoundSet({
    genres: params.genres,
    artists: params.artists,
    years: params.years,
    count: params.count,
  });

  const sets = data?.sets ?? [];

  const [revealOpen, setRevealOpen] = useState(false);

  // ── Session state (owned here, not by usePlaySession) ─
  const [phase, setPhase] = useState('listen');      // 'listen' | 'questions'
  const [setIndex, setSetIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  const mixRef = useRef(null);

  const currentSet = sets[setIndex];
  const currentQuestion = currentSet?.questions[questionIndex];
  const totalQuestions = sets.reduce((s, x) => s + x.questions.length, 0);
  const questionNumber = sets
    .slice(0, setIndex)
    .reduce((s, x) => s + x.questions.length, 0) + questionIndex + 1;

  const isLastQuestionInSet =
    currentSet && questionIndex + 1 >= currentSet.questions.length;
  const isLastSet = setIndex + 1 >= sets.length;
  const isLastQuestionOverall = isLastQuestionInSet && isLastSet;

  // ── Transitions ────────────────────────────────────────
  function startQuestions() {
    setPhase('questions');
  }

  function pick(value, overrideCorrect) {
    if (revealed) return;
    setPicked(value);
    setRevealed(true);
    const correct = typeof overrideCorrect === 'boolean'
      ? overrideCorrect
      : value === currentQuestion.correctValue;
    if (correct) setScore(s => s + 1);
  }

  function next() {
    setPicked(null);
    setRevealed(false);

   
    // More questions in this set?
    if (!isLastQuestionInSet) {
      setQuestionIndex(i => i + 1);
      return;
    }

    // More sets?
    if (!isLastSet) {
      setSetIndex(i => i + 1);
      setQuestionIndex(0);
      setPhase('listen');
      setRevealOpen(false);   
      return;
    }

    // Done
    setFinished(true);
    const best = storage.getHighScore();
    if (score > best) storage.setHighScore(score);
  }

  // ── Render: loading / error / empty / finished ────────
  if (isLoading) {
    return (
      <BorderContainer border="all" className="p-8">
        <Loader variant="page" label="Preparing mixes…" />
      </BorderContainer>
    );
  }
  if (error) return <ErrorBlock error={error} />;
  if (sets.length === 0) return <EmptyBlock />;
  if (finished) {
    return (
      <EndScreen
        score={score}
        total={totalQuestions}
        onReplay={() => window.location.reload()}
      />
    );
  }

  // ── Render: listen phase ──────────────────────────────
  if (phase === 'listen') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <RoundHeaderLike
          setNumber={setIndex + 1}
          totalSets={sets.length}
          score={score}
        />

        <BorderContainer border="all" className="p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              The Mix
            </p>
            <h2 className="text-xl font-bold text-ink leading-snug">
              {/* {currentSet.clips.length}  */}
              Tracks are about to play together.
            </h2>
            <p className="text-sm text-ink-muted">
              Listen to the blend. Every question is about the mix as a whole —
              you won't be able to isolate a single track.
            </p>
          </div>

          <MultiClipPlayer ref={mixRef} clips={currentSet.clips} />

          <div className="flex justify-end pt-2">
            <Button onClick={startQuestions} variant="primary">
              I'm ready →
            </Button>
          </div>
        </BorderContainer>
      </div>
    );
  }

  // ── Render: questions phase ───────────────────────────
  const q = currentQuestion;
  const useTyping =
    params.answerMode === 'type' &&
    TYPING_ALLOWED.has(q.type);

  const correctLabel =
    q.options.find(o => o.value === q.correctValue)?.label ?? q.correctValue;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <RoundHeaderLike
        setNumber={setIndex + 1}
        totalSets={sets.length}
        score={score}
        questionNumber={phase === 'questions' ? questionNumber : undefined}
        totalQuestions={phase === 'questions' ? totalQuestions : undefined}
      />

      {/* The mix player — always present, changes size by phase */}
      <BorderContainer border="all" className={phase === 'listen' ? 'p-6 space-y-6' : 'p-3'}>
        {phase === 'listen' ? (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                The Mix
              </p>
              <h2 className="text-xl font-bold text-ink leading-snug">
                {currentSet.clips.length} tracks are about to play together.
              </h2>
              <p className="text-sm text-ink-muted">
                Listen to the blend. Every question is about the mix as a whole —
                you won't be able to isolate a single track.
              </p>
            </div>
            <MultiClipPlayer
              ref={mixRef}
              clips={currentSet.clips}
              compact={false}
            />
            <div className="flex justify-end pt-2">
              <Button onClick={startQuestions} variant="primary">
                I'm ready →
              </Button>
            </div>
          </>
        ) : (
          <MultiClipPlayer
            ref={mixRef}
            clips={currentSet.clips}
            compact={true}
          />
        )}
      </BorderContainer>

      {/* Question card — only in questions phase */}
      {phase === 'questions' && (
        <BorderContainer border="all" className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              {currentQuestion.type}
            </p>
            <p className="text-xl font-bold text-ink leading-snug mt-2">
              {currentQuestion.prompt}
            </p>
          </div>

          {useTyping ? (
            <TextAnswerInput
              onSubmit={(rawInput) => {
                const correct = isAnswerCorrect(rawInput, currentQuestion.correctValue);
                pick(rawInput, correct);
              }}
              revealed={revealed}
              userAnswer={picked}
              correctLabel={correctLabel}
              correct={
                revealed && picked != null
                  ? isAnswerCorrect(picked, currentQuestion.correctValue)
                  : null
              }
            />
          ) : (
            <OptionsGrid
              options={currentQuestion.options}
              correctValue={currentQuestion.correctValue}
              picked={picked}
              revealed={revealed}
              onPick={pick}
            />
          )}

          {revealed && picked === '__TIMEOUT__' && (
            <p className="text-wrong text-sm">
              ⏱ Time's up — you didn't answer in time.
            </p>
          )}

          {revealed && (
            <div className="flex justify-end pt-2">
              <Button onClick={next}>
                {isLastQuestionOverall ? 'See results' : 'Next →'}
              </Button>
            </div>
          )}

        </BorderContainer>

)}
        {/* Reveal panel */}
        {phase === 'questions' && revealed && isLastQuestionInSet && (
        <BorderContainer border="all" className="p-4 space-y-3">
            <button
            type="button"
            onClick={() => setRevealOpen(o => !o)}
            className="
                w-full flex items-center justify-between
                text-sm font-medium text-highlight
                hover:text-accent transition-colors
            "
            >
            <span>
                {revealOpen ? '▾' : '▸'} Reveal the tracks ({currentSet.clips.length})
            </span>
            <span className="text-xs text-ink-subtle font-normal">
                Listen to each track on its own
            </span>
            </button>

            {revealOpen && (
            <RevealedTracks clips={currentSet.clips} />
            )}
        </BorderContainer>
        )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Small internal header — rounds + score + optional Q counter
   ═══════════════════════════════════════════════════════════ */

function RoundHeaderLike({
  setNumber,
  totalSets,
  score,
  questionNumber,
  totalQuestions,
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">
        Set <span className="text-ink">{setNumber}</span>
        <span className="text-ink-subtle"> / {totalSets}</span>
        {questionNumber != null && (
          <span className="text-ink-subtle ml-3">
            Q{questionNumber} / {totalQuestions}
          </span>
        )}
      </span>
      <span className="text-ink">
        Score: <span className="text-highlight font-semibold">{score}</span>
      </span>
    </div>
  );
}