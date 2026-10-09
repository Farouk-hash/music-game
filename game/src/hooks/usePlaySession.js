import { useState, useEffect } from 'react';


/**
 * Round + question state machine. Both levels 1 and 2 use it.
 *
 * Required `rounds` shape:
 *   [{ clip: { serveUrl }, questions: [{ type, prompt, options, correctValue }] }]
 *
 * Level 1 normalizes its single-question response into this shape before passing.
 *
 * Now also tracks per-round scores for ProgressBar tiering:
 *   roundScores[i] = { correct, total }   // updates live as questions are answered
 */
export function usePlaySession(rounds, { timerSeconds = 0 } = {}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);

  // Per-round correctness. Keys are roundIndex values.
  // Total is initialised lazily on first pick for that round, so the
  // ProgressBar can compute live tiers without needing the round's shape.
  const [roundScores, setRoundScores] = useState({});

  const currentRound = rounds[roundIndex];
  const currentQuestion = currentRound?.questions[questionIndex];
  const totalQuestions = rounds.reduce((s, r) => s + r.questions.length, 0);
  const questionNumber = rounds
    .slice(0, roundIndex)
    .reduce((s, r) => s + r.questions.length, 0) + questionIndex + 1;

  const isLastQuestionInRound =
    currentRound && questionIndex + 1 >= currentRound.questions.length;
  const isLastRound = roundIndex + 1 >= rounds.length;
  const isLastQuestionOverall = isLastQuestionInRound && isLastRound;

  // ── Countdown ──────────────────────────────────────
  useEffect(() => {
    if (timerSeconds <= 0) return;
    if (revealed || finished) return;

    setTimeLeft(timerSeconds);
    const startedAt = Date.now();

    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, timerSeconds - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(id);
        setPicked('__TIMEOUT__');
        setRevealed(true);
        setTimedOut(true);
      }
    }, 250);

    return () => clearInterval(id);
  }, [roundIndex, questionIndex, timerSeconds, revealed, finished]);

  // ── Answer handling ────────────────────────────────
  function pick(value, overrideCorrect) {
    if (revealed) return;
    setPicked(value);
    setRevealed(true);

    const correct = typeof overrideCorrect === 'boolean'
      ? overrideCorrect
      : value === currentQuestion.correctValue;

    if (correct) setScore(s => s + 1);

    // Update the running score for the current round.
    setRoundScores(prev => {
      const total = currentRound.questions.length;
      const cur = prev[roundIndex] ?? { correct: 0, total };
      return {
        ...prev,
        [roundIndex]: {
          correct: cur.correct + (correct ? 1 : 0),
          total,
        },
      };
    });
  }

  function next() {
    setPicked(null);
    setRevealed(false);
    setTimedOut(false);

    if (!isLastQuestionInRound) {
      setQuestionIndex(i => i + 1);
      return;
    }
    if (!isLastRound) {
      setRoundIndex(i => i + 1);
      setQuestionIndex(0);
      return;
    }
    setFinished(true);
    const best = typeof window !== 'undefined' ? Number(localStorage.getItem('game.highScore') ?? 0) : 0;
    if (score > best) {
      try { localStorage.setItem('game.highScore', String(score)); } catch {}
    }
  }

  return {
    roundIndex,
    questionIndex,
    score,
    picked,
    revealed,
    finished,
    currentRound,
    currentQuestion,
    currentClip: currentRound?.clip,
    totalQuestions,
    questionNumber,
    roundNumber: roundIndex + 1,
    totalRounds: rounds.length,
    isLastQuestionOverall,
    pick,
    next,
    // timer
    timeLeft,
    timedOut,
    hasTimer: timerSeconds > 0,
    // progress bar
    roundScores,
  };
}