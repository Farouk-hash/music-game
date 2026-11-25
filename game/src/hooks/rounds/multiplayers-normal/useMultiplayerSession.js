// game/src/hooks/rounds/useMultiplayerSession.js
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';

export function useMultiplayerSession({
  players = [],
  playerRounds = [],
  timerSeconds = 0,
} = {}) {
  const online = useNetworkStatus();
  const paused = !online;

  const [roundScores, setRoundScores] = useState({});
  const playerCount = players.length;

  // Interleave the per-player batches, normalizing the question shape:
  //   level 1 rounds have `question` (single)
  //   level 2/3 rounds have `questions` (array)
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

  // Time left for the current question; a ref so pausing (offline) resumes instead of restarting.
  const remainingRef = useRef(timerSeconds);

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

  // Full time again for every new question / turn.
  useEffect(() => {
    remainingRef.current = timerSeconds;
    setTimeLeft(timerSeconds);
  }, [roundIndex, questionIndex, phase, timerSeconds]);

  // Ticking. Frozen while offline.
  useEffect(() => {
    if (timerSeconds <= 0) return;
    if (phase !== 'playing') return;
    if (revealed || finished || paused) return;

    const startedAt = Date.now();
    const startRemaining = remainingRef.current;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, startRemaining - elapsed);
      remainingRef.current = remaining;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        setPicked('__TIMEOUT__');
        setRevealed(true);
        setTimedOut(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [roundIndex, questionIndex, phase, timerSeconds, revealed, finished, paused]);

  function startTurn() {
    if (phase !== 'turn-intro') return;
    setPhase('playing');
    setPicked(null);
    setRevealed(false);
    setTimedOut(false);
  }

  function pick(value, overrideCorrect) {
    if (revealed || phase !== 'playing') return;
    if (!currentQuestion) return;
    setPicked(value);
    setRevealed(true);

    const correct = typeof overrideCorrect === 'boolean'
      ? overrideCorrect
      : value === currentQuestion.correctValue;

    if (correct) {
      setScores((prev) => {
        const next = [...prev];
        next[currentPlayerIndex] = (next[currentPlayerIndex] ?? 0) + 1;
        return next;
      });
    }

    // Track the round's result for the progress bar. A round may have several
    // questions (level 2/3); accumulate correct/answered.
    setRoundScores((prev) => {
      const total = currentQuestions.length;
      const cur = prev[roundIndex] ?? { correct: 0, total, answered: 0 };
      return {
        ...prev,
        [roundIndex]: {
          correct: cur.correct + (correct ? 1 : 0),
          total,
          answered: (cur.answered ?? 0) + 1,
        },
      };
    });
  }

  function next() {
    setPicked(null);
    setRevealed(false);
    setTimedOut(false);

    if (!isLastQuestionInRound) {
      setQuestionIndex((i) => i + 1);
      return;
    }

    if (!isLastRound) {
      setRoundIndex((i) => i + 1);
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
    timerPaused: paused,
    startTurn,
    pick,
    roundScores,
    next,
  };
}