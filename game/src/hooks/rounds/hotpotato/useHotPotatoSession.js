import { useState, useMemo, useEffect, useRef } from 'react';
import { isAnswerCorrect } from '@/hooks/rounds/features/answerCheck.js';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';

export function useHotPotatoSession({
  players = [],
  sharedRounds = [], // Must be flattened with trackSlotId metadata
  timerSeconds = 0,
} = {}) {
  const online = useNetworkStatus();
  const paused = !online;

  // Group flat questions by track for batched navigation
  const tracks = useMemo(() => {
    const map = new Map();
    sharedRounds.forEach((q) => {
      const key = q.trackSlotId ?? q.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(q);
    });
    return Array.from(map.values());
  }, [sharedRounds]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [questionInTrackIndex, setQuestionInTrackIndex] = useState(0);
  const [phase, setPhase] = useState('turn-intro');
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [finished, setFinished] = useState(false);
  const [hiddenAnswers, setHiddenAnswers] = useState(new Map());
  const remainingRef = useRef(timerSeconds);

  const currentTrack = tracks[trackIndex];
  const currentRound = currentTrack?.[questionInTrackIndex];
  const currentPlayerName = players[currentPlayerIndex];
  
  const isLastTrack = trackIndex + 1 >= tracks.length;
  const isLastQuestionInTrack = questionInTrackIndex + 1 >= (currentTrack?.length ?? 0);
  const isLastPlayer = currentPlayerIndex + 1 >= players.length;

  // Scores computed after game ends
  const aggregatedScores = useMemo(() => {
  const scores = players.map(() => 0);
  
  // ✅ Build a map of all stored answers for O(1) lookup
  const answerMap = new Map();
  hiddenAnswers.forEach((value, key) => {
    answerMap.set(key, value);
  });
  
  sharedRounds.forEach((round) => {
    players.forEach((_, pi) => {
      // ✅ Use EXACT same key format as pick() function
      const key = `${round.id}-${pi}`;
      const answer = answerMap.get(key);
      
      if (answer == null) return;
      if (answer === round.correctValue || isAnswerCorrect(answer, round.correctValue)) {
        scores[pi] += 1;
      }
    });
  });
  return scores;
}, [sharedRounds, hiddenAnswers, players]);

  // Reset timer on every new question turn
  useEffect(() => {
    remainingRef.current = timerSeconds;
    setTimeLeft(timerSeconds);
  }, [trackIndex, questionInTrackIndex, currentPlayerIndex, phase, timerSeconds]);

  // Timer ticking logic
  useEffect(() => {
    if (timerSeconds <= 0 || phase !== 'playing' || revealed || finished || paused) return;
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
  }, [trackIndex, questionInTrackIndex, currentPlayerIndex, phase, timerSeconds, revealed, finished, paused]);

  function startTurn() {
    if (phase !== 'turn-intro') return;
    setPhase('playing');
    setPicked(null);
    setRevealed(false);
    setTimedOut(false);
  }

  function pick(value) {
    if (revealed || phase !== 'playing') return;
    setPicked(value);
    setRevealed(true);
    // Key includes question ID to support multiple questions per track
    const key = `${currentRound.id}-${currentPlayerIndex}`;
    setHiddenAnswers((prev) => new Map(prev).set(key, value));
  }

 function next() {
  setPicked(null);
  setRevealed(false);
  setTimedOut(false);

  // ✅ CASE 1: More questions in this track → Next question, SAME player
  if (!isLastQuestionInTrack) {
    setQuestionInTrackIndex((i) => i + 1);
    // ✅ Don't show banner - same player continues immediately
    setPhase('playing'); 
    return;
  }

  // ✅ CASE 2: Last question in track, more players → Pass device
  if (!isLastPlayer) {
    setCurrentPlayerIndex((i) => i + 1);
    setQuestionInTrackIndex(0);
    setPhase('turn-intro'); // ✅ Show banner only when player changes
    return;
  }

  // ✅ CASE 3: All players done with this track → Move to next track
  if (!isLastTrack) {
    setTrackIndex((i) => i + 1);
    setCurrentPlayerIndex(0);
    setQuestionInTrackIndex(0);
    setPhase('turn-intro'); // ✅ Show banner for new track start
    return;
  }

  // ✅ CASE 4: Everything finished
  setFinished(true);
  setPhase('revealing');
}

  function dismissReveal() {
    setPhase('game-end');
  }

  return {
    phase,
    trackIndex,
    questionInTrackIndex,
    currentPlayerIndex,
    currentPlayerName,
    currentRound,
    currentTrack,
    totalTracks: tracks.length,
    players,
    picked,
    revealed,
    timedOut,
    timeLeft,
    finished,
    hasTimer: timerSeconds > 0,
    timerPaused: paused,
    hiddenAnswers,
    aggregatedScores,
    isLastTrack,
    isLastQuestionInTrack,
    isLastPlayer,
    startTurn,
    pick,
    next,
    dismissReveal,
  };
}