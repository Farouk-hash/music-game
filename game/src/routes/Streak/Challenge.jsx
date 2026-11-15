// game/src/routes/Streak/Challenge.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStreak } from '@/hooks/streaks/useStreak.js';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { fetchStreakQuestions } from './fetchQuestions';
import { isAnswerCorrect } from '@/hooks/rounds/answerCheck';
import { useChallengeConfig } from '@/context/ChallengeConfigContext';
import { ChallengePreview } from '@/components/domain/Streak/Challenge/ChallengePreview';
import { ChallengePlay } from '@/components/domain/Streak/Challenge/ChallengePlay';
const PHASE = {
  PREVIEW: 'preview',
  PLAYING: 'playing',
  SUBMITTING: 'submitting',
};

export default function StreakChallenge() {
  const navigate = useNavigate();
  const { genreKey } = useParams();
  const genreId = genreKey === 'default' ? null : Number(genreKey);
  const config = useChallengeConfig();
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

  const currentBatch = allBatches?.[batchIndex] ?? null;
  const currentQuestion = currentBatch?.questions?.[questionIndex] ?? null;

  const batchTimerSeconds =
    currentBatch?.timer ?? challenge?.config?.timerByBatch?.[batchIndex] ?? 15;

  const [timeLeft, setTimeLeft] = useState(batchTimerSeconds);
  const [timedOut, setTimedOut] = useState(false);

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
  }, [challenge?.challenge_date]);

  // ── Per-batch timer (unchanged deps — the timer is PER-BATCH) ──
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return;
    if (!currentBatch) return;
    setTimeLeft(batchTimerSeconds);
    setTimedOut(false);

    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, batchTimerSeconds - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        setTimedOut(true);
      }
    }, 100);

    return () => clearInterval(id);
  }, [phase, batchIndex, batchTimerSeconds]);

  // ── Timeout → wrong answer (unchanged) ───────────────
  useEffect(() => {
    if (!timedOut || revealed) return;
    setPicked('__TIMEOUT__');
    setRevealed(true);
    setBatchResults(prev => {
      const next = [...prev];
      if (!next[batchIndex]) next[batchIndex] = { correct: 0, total: 0 };
      next[batchIndex].total += 1;
      return next;
    });
  }, [timedOut]);

  // ── Handlers (unchanged) ─────────────────────────────
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
      alert(`Failed to load questions: ${e.message}`);
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
    setBatchResults(prev => {
      const next = [...prev];
      if (!next[batchIndex]) next[batchIndex] = { correct: 0, total: 0 };
      if (correct) next[batchIndex].correct += 1;
      next[batchIndex].total += 1;
      return next;
    });
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

    try {
      const result = await submit(submitPayload);
      console.log('[streak] submit result', result);
      navigate(`/streak/result/${genreKey}`);
    } catch (e) {
      console.error('[streak] submit threw', e);
      alert(`Submit failed: ${e?.message ?? 'unknown error'}`);
      setPhase(PHASE.PLAYING);
    }
  }

  async function handleWatchAd() {
    try {
      await grantBonus();
    } catch (e) {
      console.error('[streak] bonus failed', e);
      alert(`Bonus failed: ${e.message}`);
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
      />
    );
  }

  if (phase === PHASE.SUBMITTING || submitting) {
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