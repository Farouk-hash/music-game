// game/src/hooks/useMultiplayerSession.js
import { useState, useMemo, useEffect } from 'react';

export function useMultiplayerSession({
  players = [],
  playerRounds = [],
  timerSeconds = 0,
} = {}) {
const [roundScores, setRoundScores] = useState({});
  const playerCount = players.length;

  // Interleave the per-player batches, normalizing the question shape:
  //   level 1 rounds have `question` (single)
  //   level 2 rounds have `questions` (array)
  //   level 3 rounds have `questions` (array) but are handled separately
  const flatRounds = useMemo(() => {
    if (!playerRounds.length || !playerCount) return [];
    const totalRounds = playerRounds.reduce((s, p) => s + (p.rounds?.length ?? 0), 0);
    const out = [];
    for (let k = 0; k < totalRounds; k++) {
      const playerIdx = k % playerCount;
      const withinPlayer = Math.floor(k / playerCount);
      const raw = playerRounds[playerIdx]?.rounds?.[withinPlayer];
      if (!raw) continue;

      const questions = Array.isArray(raw.questions)
        ? raw.questions
        : raw.question
          ? [{ ...raw.question, type: raw.type }]
          : [];

      out.push({
        round: raw,
        roundIndex: k,
        playerIndex: playerIdx,
        questions,
      });
    }
    return out;
  }, [playerRounds, playerCount]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState('turn-intro');
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState(() => players.map(() => 0));
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);

  useEffect(() => {
    setScores(players.map(() => 0));
  }, [playerCount]);

  const current = flatRounds[roundIndex];
  const currentQuestions = current?.questions ?? [];
  const currentPlayerIndex = current?.playerIndex ?? 0;
  const currentPlayerName = players[currentPlayerIndex] ?? '';
  const currentRound = current?.round;
  const currentQuestion = currentQuestions[questionIndex];
  const totalRounds = flatRounds.length;
  const isLastQuestionInRound =
    currentQuestions.length > 0 && questionIndex + 1 >= currentQuestions.length;
  const isLastRound = roundIndex + 1 >= totalRounds;

  useEffect(() => {
    if (timerSeconds <= 0) return;
    if (phase !== 'playing') return;
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
  }, [roundIndex, questionIndex, phase, timerSeconds, revealed, finished]);

  function startTurn() {
    if (phase !== 'turn-intro') return;
    setPhase('playing');
    setPicked(null);
    setRevealed(false);
    setTimedOut(false);
  }

  function pick(value, overrideCorrect) {
    if (revealed) return;
    if (!currentQuestion) return;
    setPicked(value);
    setRevealed(true);

    const correct = typeof overrideCorrect === 'boolean'
        ? overrideCorrect
        : value === currentQuestion.correctValue;

    if (correct) {
        setScores(prev => {
        const next = [...prev];
        next[currentPlayerIndex] = (next[currentPlayerIndex] ?? 0) + 1;
        return next;
        });
    }

    // Track the round's result for the ProgressBar. A round may have
    // multiple questions (level 2); accumulate correct/total.
    setRoundScores(prev => {
        const total = currentQuestions.length;
        const cur = prev[roundIndex] ?? { correct: 0, total, answered: 0 };
        return {
            ...prev,
            [roundIndex]: {
            correct: cur.correct + (correct ? 1 : 0),
            total,
            answered: (cur.answered ?? 0) + 1,   // ← new field
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
      setPhase('turn-intro');
      return;
    }

    setFinished(true);
    setPhase('game-end');
  }

  return {
    phase,
    roundIndex,
    questionIndex,
    current,
    currentRound,
    currentQuestions,
    currentQuestion,
    currentPlayerIndex,
    currentPlayerName,
    scores,
    picked,
    revealed,
    finished,
    timedOut,
    timeLeft,
    totalRounds,
    roundNumber: roundIndex + 1,
    isLastQuestionOverall: isLastRound && isLastQuestionInRound,
    hasTimer: timerSeconds > 0,
    startTurn,
    pick,
    roundScores,
    next,
  };
}