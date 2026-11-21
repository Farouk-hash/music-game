// game/src/hooks/rounds/usePlaySession.js
import { useState, useEffect } from 'react';
import { LIFELINE_COST } from '@/constants/lifelines';

export function usePlaySession(rounds, { timerSeconds = 0 } = {}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [roundScores, setRoundScores] = useState({});
  const [hiddenOptions, setHiddenOptions] = useState({});

  const currentRound = rounds[roundIndex];
  const currentQuestion = currentRound?.questions[questionIndex];
  const totalQuestions = rounds.reduce((s, r) => s + r.questions.length, 0);

  const isLastQuestionInRound =
    currentRound && questionIndex + 1 >= currentRound.questions.length;
  const isLastRound = roundIndex + 1 >= rounds.length;
  const isLastQuestionOverall = isLastQuestionInRound && isLastRound;

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

  function bumpRound(deltaCorrect, deltaCost) {
    setRoundScores(prev => {
      const total = currentRound.questions.length;
      const cur = prev[roundIndex] ?? { correct: 0, cost: 0, total };
      return {
        ...prev,
        [roundIndex]: {
          correct: cur.correct + deltaCorrect,
          cost: (cur.cost ?? 0) + deltaCost,
          total,
        },
      };
    });
  }

  function pick(value, overrideCorrect) {
    if (revealed) return;
    setPicked(value);
    setRevealed(true);

    const correct = typeof overrideCorrect === 'boolean'
      ? overrideCorrect
      : value === currentQuestion.correctValue;

    if (correct) {
      setScore(s => s + 1);
      bumpRound(1, 0);
    } else {
      bumpRound(0, 0);
    }
  }

  function skip() {
    if (revealed) return;
    setPicked('__SKIP__');
    setRevealed(true);
    bumpRound(0, 0);
  }

  function revealAnswer() {
    if (revealed) return;
    setPicked('__REVEAL__');
    setRevealed(true);
    const cost = LIFELINE_COST.reveals ?? 0;
    if (cost > 0) setScore(s => s - cost);
    bumpRound(0, cost);
  }

  function hideOption(value) {
    if (revealed) return;
    setHiddenOptions(prev => ({
      ...prev,
      [`${roundIndex}:${questionIndex}`]: value,
    }));
    const cost = LIFELINE_COST.removes ?? 0;
    if (cost > 0) setScore(s => s - cost);
    bumpRound(0, cost);
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
    const best = typeof window !== 'undefined'
      ? Number(localStorage.getItem('game.highScore') ?? 0)
      : 0;
    if (score > best) {
      try { localStorage.setItem('game.highScore', String(score)); } catch {}
    }
  }

  function restart() {
    setRoundIndex(0);
    setQuestionIndex(0);
    setScore(0);
    setPicked(null);
    setRevealed(false);
    setFinished(false);
    setTimedOut(false);
    setTimeLeft(timerSeconds);
    setRoundScores({});
    setHiddenOptions({});
  }

  // Calculate once here
  const currentHiddenOption = hiddenOptions[`${roundIndex}:${questionIndex}`] ?? null;
  const alreadyRemovedHere = currentHiddenOption !== null;

  return {
    roundIndex, questionIndex, score, picked, revealed, finished,
    currentRound, currentQuestion, currentClip: currentRound?.clip,
    totalQuestions,
    restart, 
    roundNumber: roundIndex + 1, totalRounds: rounds.length,
    isLastQuestionOverall,
    pick, skip, revealAnswer, hideOption, next,
    timeLeft, timedOut, hasTimer: timerSeconds > 0,
    roundScores,
    currentHiddenOption,
    alreadyRemovedHere,
  };
}