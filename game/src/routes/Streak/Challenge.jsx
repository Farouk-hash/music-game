// game/src/routes/Streak/Challenge.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStreak } from '@/hooks/streaks/useStreak.js';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { fetchStreakQuestions } from './fetchQuestions';
import { isAnswerCorrect } from '@/hooks/rounds/features/answerCheck';
import { useChallengeConfig } from '@/context/ChallengeConfigContext';
import { ChallengePreview } from '@/components/domain/Streak/Challenge/ChallengePreview';
import { ChallengePlay } from '@/components/domain/Streak/Challenge/ChallengePlay';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';
import { isNetworkError } from '@/lib/api.js';

const PHASE = {
  PREVIEW: 'preview',
  PLAYING: 'playing',
  SUBMITTING: 'submitting',
};

// Immutable update (the old code mutated state objects in place, which
// double-counts under React StrictMode in development).
function bumpResult(prev, idx, correct) {
  const next = [...prev];
  const cur = next[idx] ?? { correct: 0, total: 0 };
  next[idx] = {
    correct: cur.correct + (correct ? 1 : 0),
    total: cur.total + 1,
  };
  return next;
}

export default function StreakChallenge() {
  const navigate = useNavigate();
  const { genreKey } = useParams();
  const genreId = genreKey === 'default' ? null : Number(genreKey);
  const config = useChallengeConfig();
  const online = useNetworkStatus();
  const {
    challenge, streak, power, loading, error,
    streakDay, consecutiveFailures, easyMode,
    totalBatches, questionsPerBatch,
    submit, submitting,
    grantBonus, grantingBonus,
    dailyAttempted,
  } = useStreak({ genreId });

  const [phase, setPhase] = useState(PHASE.PREVIEW);
  const [mode, setMode] = useState('daily');

  const [batchIndex, setBatchIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [allBatches, setAllBatches] = useState(null);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);

  // A finished run whose submission failed. It is kept here so the player can
  // retry WITHOUT replaying (and without being able to change answers).
  const [submitError, setSubmitError] = useState(null);
  const pendingPayloadRef = useRef(null);

  const currentBatch = allBatches?.[batchIndex] ?? null;
  const currentQuestion = currentBatch?.questions?.[questionIndex] ?? null;

  const batchTimerSeconds =
    currentBatch?.timer ?? challenge?.config?.timerByBatch?.[batchIndex] ?? 15;

  const [timeLeft, setTimeLeft] = useState(batchTimerSeconds);
  const [timedOut, setTimedOut] = useState(false);

  // Time left in the current batch. Kept in a ref so pausing (offline) and
  // resuming continues from where it stopped instead of restarting.
  const remainingRef = useRef(batchTimerSeconds);
  const paused = !online;

  // ── Reset state when the challenge date changes ──────
  useEffect(() => {
    if (!challenge) return;
    setPhase(PHASE.PREVIEW);
    setBatchIndex(0);
    setQuestionIndex(0);
    setBatchResults([]);
    setPicked(null);
    setRevealed(false);
    setAllBatches(null);
    setTimedOut(false);
    setSubmitError(null);
    pendingPayloadRef.current = null;
  }, [challenge?.challenge_date]);

  // ── Per-batch timer: reset at the start of each batch ──
  // (declared BEFORE the ticking effect so it runs first in the same commit)
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return;
    if (!currentBatch) return;
    remainingRef.current = batchTimerSeconds;
    setTimeLeft(batchTimerSeconds);
    setTimedOut(false);
  }, [phase, batchIndex, batchTimerSeconds]);

  // ── Per-batch timer: ticking. Frozen while offline. ──
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return;
    if (!currentBatch) return;
    if (paused) return;
    if (remainingRef.current <= 0) return; // already expired

    const start = Date.now();
    const startRemaining = remainingRef.current;
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, startRemaining - elapsed);
      remainingRef.current = left;
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        setTimedOut(true);
      }
    }, 100);

    return () => clearInterval(id);
  }, [phase, batchIndex, batchTimerSeconds, paused]);

  // ── Timeout → wrong answer ───────────────────────────
  useEffect(() => {
    if (!timedOut || revealed) return;
    setPicked('__TIMEOUT__');
    setRevealed(true);
    setBatchResults(prev => bumpResult(prev, batchIndex, false));
  }, [timedOut]);

  // ── Submit (with retry) ──────────────────────────────
  const doSubmit = useCallback(async (payload) => {
    setSubmitError(null);
    try {
      const result = await submit(payload);
      console.log('[streak] submit result', result);
      pendingPayloadRef.current = null;
      navigate(`/streak/result/${genreKey}`);
    } catch (e) {
      console.error('[streak] submit threw', e);
      // Stay on the saving screen (phase unchanged) and offer a retry. Going
      // back to PLAYING would let the player answer the last question again.
      setSubmitError(e);
    }
  }, [submit, navigate, genreKey]);

  // If the failure was "offline" nothing was sent, so it is safe to retry
  // automatically once the connection is back. A "server unreachable" failure
  // may have reached the server, so that one is manual only.
  useEffect(() => {
    if (!submitError?.isOffline) return;
    function onOnline() {
      if (pendingPayloadRef.current) doSubmit(pendingPayloadRef.current);
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [submitError, doSubmit]);

  // ── Handlers ─────────────────────────────────────────
  async function handleStart(chosenMode) {
    setMode(chosenMode);
    setFetchingQuestions(true);
    try {
      const batches = await fetchStreakQuestions({
        genreId: challenge.genre_id,
        artistIds: challenge.artist_ids,
        config,
        challengeConfig: challenge.config,
        totalBatches,
        questionsPerBatch,
        easyMode,
      });
      console.log('[streak] batches fetched', batches);
      setAllBatches(batches);
      setPhase(PHASE.PLAYING);
    } catch (e) {
      console.error('[streak] fetch questions failed', e);
      alert(
        e?.isOffline
          ? "You're offline. Reconnect and try again."
          : isNetworkError(e)
            ? "Can't reach the server. Please try again in a moment."
            : `Failed to load questions: ${e.message}`
      );
    } finally {
      setFetchingQuestions(false);
    }
  }

  function handleAnswer(value, isCorrectArg) {
    let correct;
    if (isCorrectArg !== undefined) {
      correct = isCorrectArg;
    } else if (currentQuestion?.type === 'name-position') {
      correct = isAnswerCorrect(value, currentQuestion.correctValue);
    } else {
      correct = String(value).trim().toLowerCase() ===
                String(currentQuestion?.correctValue ?? '').trim().toLowerCase();
    }

    setPicked(value);
    setRevealed(true);
    setBatchResults(prev => bumpResult(prev, batchIndex, correct));
  }

  async function handleNext() {
    setPicked(null);
    setRevealed(false);
    setTimedOut(false);

    const isLastQuestionInBatch =
      questionIndex + 1 >= (currentBatch?.questions?.length ?? 1);

    if (!isLastQuestionInBatch) {
      setQuestionIndex(q => q + 1);
      return;
    }

    if (batchIndex + 1 < totalBatches) {
      setBatchIndex(b => b + 1);
      setQuestionIndex(0);
      return;
    }

    setPhase(PHASE.SUBMITTING);

    const correctCount = batchResults.reduce((a, r) => a + (r?.correct ?? 0), 0);
    const totalCount = batchResults.reduce((a, r) => a + (r?.total ?? 0), 0);

    const passed = batchResults.every(r => {
      const correct = r?.correct ?? 0;
      const total = r?.total ?? 0;
      if (total === 0) return false;
      if (total === 1) return correct === 1;
      return correct >= Math.ceil(total * 0.6);
    });

    const submitPayload = {
      correctCount,
      totalCount,
      batchesDone: totalBatches,
      passed,
      mode,
    };

    console.log('[streak] submitting payload', submitPayload);
    pendingPayloadRef.current = submitPayload;
    await doSubmit(submitPayload);
  }

  async function handleWatchAd() {
    try {
      await grantBonus();
    } catch (e) {
      console.error('[streak] bonus failed', e);
      alert(
        e?.isOffline
          ? "You're offline. Reconnect and try again."
          : `Bonus failed: ${e.message}`
      );
    }
  }

  // ── Render ───────────────────────────────────────────
  if (loading) return <Loader variant="page" label="Loading today's challenge…" />;

  if (error) {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-wrong">{error.message}</p>
        <Button onClick={() => navigate('/setup')}>Back to setup</Button>
      </BorderContainer>
    );
  }

  if (!challenge) return null;

  if (phase === PHASE.PREVIEW) {
    return (
      <ChallengePreview
        challenge={challenge}
        streak={streak}
        power={power}
        streakDay={streakDay}
        consecutiveFailures={consecutiveFailures}
        easyMode={easyMode}
        totalBatches={totalBatches}
        questionsPerBatch={questionsPerBatch}
        dailyAttempted={dailyAttempted}
        fetchingQuestions={fetchingQuestions}
        grantingBonus={grantingBonus}
        onStart={handleStart}
        onWatchAd={handleWatchAd}
        online={online}
      />
    );
  }

  if (phase === PHASE.SUBMITTING || submitting) {
    // Submission failed: keep the finished run and let the player retry.
    if (submitError && !submitting) {
      return (
        <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen">
          <BorderContainer border="all" className="p-8 mt-16 text-center space-y-4">
            <p className="text-ink font-medium text-lg">
              {submitError.isOffline ? "You're offline" : "Couldn't save your progress"}
            </p>
            <p className="text-ink-muted text-sm">
              {submitError.isOffline
                ? 'Your answers are kept on this page. We will save them as soon as you are back online.'
                : isNetworkError(submitError)
                  ? 'The server could not be reached. Your answers are kept on this page, so you can try again.'
                  : submitError.message}
            </p>
            <p className="text-ink-subtle text-xs">
              Please keep this page open until your progress is saved.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => pendingPayloadRef.current && doSubmit(pendingPayloadRef.current)}
                disabled={!online}
              >
                Try again
              </Button>
            </div>
          </BorderContainer>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen">
        <div className="pt-16 text-center">
          <Loader variant="page" label="Saving your progress…" />
        </div>
      </div>
    );
  }

  return (
    <ChallengePlay
      mode={mode}
      allBatches={allBatches}
      batchIndex={batchIndex}
      questionIndex={questionIndex}
      totalBatches={totalBatches}
      picked={picked}
      revealed={revealed}
      easyMode={easyMode}
      timeLeft={timeLeft}
      timedOut={timedOut}
      batchTimerSeconds={batchTimerSeconds}
      currentBatch={currentBatch}
      currentQuestion={currentQuestion}
      onAnswer={handleAnswer}
      onNext={handleNext}
      onResetPreview={() => setPhase(PHASE.PREVIEW)}
    />
  );
}