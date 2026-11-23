import { useState, useEffect, useRef, useCallback } from 'react';
import { LIFELINE_COST } from '@/constants/lifelines.js';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';
import { storage } from '@/lib/storage.js';

export function usePlaySession(rounds, { timerSeconds = 0, pauseWhenOffline = true } = {}) {
  const online = useNetworkStatus();
  const paused = pauseWhenOffline && !online;

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

  // ✅ Memory Game State
  const [studyMode, setStudyMode] = useState(false);
  const [recallPhase, setRecallPhase] = useState(false);
  const [recallSubmitted, setRecallSubmitted] = useState(false); // ✅ NEW: Tracks review state
  const [recallItems, setRecallItems] = useState([]);
  
  const remainingRef = useRef(timerSeconds);

  const currentRound = rounds[roundIndex];
  const currentQuestion = currentRound?.questions[questionIndex];
  const totalQuestions = rounds.reduce((s, r) => s + r.questions.length, 0);
  const isLastQuestionInRound = currentRound && questionIndex + 1 >= currentRound.questions.length;
  const isLastRound = roundIndex + 1 >= rounds.length;

  // ✅ Build recall items ONCE when rounds load
  useEffect(() => {
    const items = [];
    rounds.forEach((r, ri) => {
      r.questions?.forEach((q, qi) => {
        if (q.isMemory) {
          items.push({
            roundIndex: ri,
            questionIndex: qi,
            prompt: q.prompt,
            options: q.options,
            correctValue: q.correctValue,
            type: q.type,
          });
        }
      });
    });
    setRecallItems(items);
  }, [rounds]);

  // ✅ Auto-enter study mode on memory questions
  useEffect(() => {
    if (recallPhase || finished) return;
    if (currentQuestion?.isMemory && !revealed) {
      setStudyMode(true);
    } else {
      setStudyMode(false);
    }
  }, [roundIndex, questionIndex, recallPhase, finished, revealed, currentQuestion]);

  // Timer reset
  useEffect(() => {
    remainingRef.current = timerSeconds;
    setTimeLeft(timerSeconds);
  }, [roundIndex, questionIndex, timerSeconds, finished]);

  // ✅ Ticking effect - TIMER TICKS DURING STUDY BUT DOES NOT TRIGGER TIMEOUT OR ADVANCE
  useEffect(() => {
    if (timerSeconds <= 0 || revealed || finished || paused) return;
    
    const startedAt = Date.now();
    const startRemaining = remainingRef.current;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, startRemaining - elapsed);
      remainingRef.current = remaining;
      setTimeLeft(remaining);
      
      // Only trigger timeout/reveal if NOT in study mode
      if (remaining <= 0 && !studyMode) {
        clearInterval(id);
        setPicked('__TIMEOUT__');
        setRevealed(true);
        setTimedOut(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [roundIndex, questionIndex, timerSeconds, revealed, finished, paused, studyMode]);

  // ✅ Simplified transition logic
  const advanceToNext = useCallback(() => {
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

    // ✅ Enter recall phase if we have memory items
    if (recallItems.length > 0) {
      setRecallPhase(true);
      return;
    }

    setFinished(true);
    saveHighScore();
  }, [isLastQuestionInRound, isLastRound, recallItems.length]);

  // ✅ Step 1: Calculate score but DO NOT finish yet (keeps review screen visible)
const submitRecall = useCallback((answersMap) => {
  let recallScore = 0;
  
  // ✅ FIX: Use composite key to match RecallScreen's storage format
  recallItems.forEach(item => {
    const uniqueKey = `${item.roundIndex}-${item.questionIndex}`;
    const userAnswer = answersMap.get(uniqueKey);
    
    if (userAnswer === item.correctValue) {
      recallScore++;
    }
  });
  
  setScore(s => s + recallScore);
  setRecallSubmitted(true);
}, [recallItems]);
  // ✅ Step 2: Actually finish the game AFTER review
  const finishRecall = useCallback(() => {
    setFinished(true);
    saveHighScore();
  }, []);

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
    if (revealed || studyMode) return;
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
    if (revealed || studyMode) return;
    setPicked('__SKIP__');
    setRevealed(true);
    bumpRound(0, 0);
  }

  function revealAnswer() {
    if (revealed || studyMode) return;
    setPicked('__REVEAL__');
    setRevealed(true);
    const cost = LIFELINE_COST.reveals ?? 0;
    if (cost > 0) setScore(s => s - cost);
    bumpRound(0, cost);
  }

  function hideOption(value) {
    if (revealed || studyMode) return;
    setHiddenOptions(prev => ({
      ...prev,
      [`${roundIndex}:${questionIndex}`]: value,
    }));
    const cost = LIFELINE_COST.removes ?? 0;
    if (cost > 0) setScore(s => s - cost);
    bumpRound(0, cost);
  }

  function next() {
    advanceToNext();
  }

  function restart() {
    setRoundIndex(0);
    setQuestionIndex(0);
    setScore(0);
    setPicked(null);
    setRevealed(false);
    setFinished(false);
    setTimedOut(false);
    setStudyMode(false);
    setRecallPhase(false);
    setRecallSubmitted(false); // ✅ Reset on restart
    remainingRef.current = timerSeconds;
    setTimeLeft(timerSeconds);
    setRoundScores({});
    setHiddenOptions({});
  }

  function saveHighScore() {
    const best = storage.getHighScore();
    if (score > best) storage.setHighScore(score);
  }

  const currentHiddenOption = hiddenOptions[`${roundIndex}:${questionIndex}`] ?? null;
  const alreadyRemovedHere = currentHiddenOption !== null;

  return {
    roundIndex, questionIndex, score, picked, revealed, finished,
    currentRound, currentQuestion, currentClip: currentRound?.clip,
    totalQuestions,
    restart,
    roundNumber: roundIndex + 1, totalRounds: rounds.length,
    isLastQuestionOverall: isLastQuestionInRound && isLastRound && recallItems.length === 0,
    pick, skip, revealAnswer, hideOption, next,
    timeLeft, timedOut, hasTimer: timerSeconds > 0,
    timerPaused: paused,
    roundScores,
    currentHiddenOption,
    alreadyRemovedHere,
    // ✅ Memory exports
    studyMode,
    recallPhase,
    recallSubmitted, // ✅ NEW EXPORT
    recallItems,
    submitRecall,
    finishRecall,    // ✅ NEW EXPORT
  };
}