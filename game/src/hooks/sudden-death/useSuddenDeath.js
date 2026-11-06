// game/src/hooks/useSuddenDeath.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { isAnswerCorrect } from '../rounds/answerCheck';

const QUESTIONS_PER_BATCH = 5;

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

function canonicalPosition(raw) {
  const s = String(raw ?? '').trim();
  for (const [en, ar] of Object.entries(POSITION_LABELS)) {
    if (s === en || s === ar) return en;
  }
  return s;
}

export function isCorrectForQuestion(question, typed) {
  if (typed == null || typed === '') return false;
  if (question?.type === 'name-position') {
    return canonicalPosition(typed) === canonicalPosition(question.correctValue);
  }
  return isAnswerCorrect(typed, question?.correctValue);
}

export function useSuddenDeath({ playerIds, apiParams }) {
  const playerCount = playerIds.length;

  const [phase, setPhase]             = useState('loading');
  const [error, setError]             = useState(null);
  const [questions, setQuestions]     = useState([]);
  const [batchIndex, setBatchIndex]   = useState(0);
  const [qIndex, setQIndex]           = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [answers, setAnswers]         = useState({});
  const [scores, setScores]           = useState(() =>
    Object.fromEntries(playerIds.map(id => [id, 0]))
  );
  const [draft, setDraft]             = useState('');
  const [lastCommitted, setLastCommitted] = useState(null);

  const fetchTokenRef = useRef(0);

  /* ── Fetch a batch ─────────────────────────────────────── */
  const fetchBatch = useCallback(async () => {
    const token = ++fetchTokenRef.current;
    setPhase('loading');
    setError(null);

    try {
      // ── Level-aware endpoint ──────────────────────────────
      const level = Number(apiParams?.level ?? 1);
      const useMulti = level === 2;
      const endpoint = useMulti ? '/round-multi' : '/round';

      const body = {
        ...(apiParams ?? {}),
        count: QUESTIONS_PER_BATCH,
      };
      delete body.level;
      for (const k of Object.keys(body)) {
        if (body[k] == null || body[k] === '') delete body[k];
      }

      const data = await api.post(endpoint, body);
      if (token !== fetchTokenRef.current) return;

      const rawRounds = data?.rounds ?? [];
      if (rawRounds.length === 0) {
        throw new Error('No sudden-death questions available in this scope');
      }

      // ── Flatten into a single per-turn question list ─────
      const flattened = [];
      for (const r of rawRounds) {
        if (flattened.length >= QUESTIONS_PER_BATCH) break;

        if (useMulti) {
          const qs = Array.isArray(r.questions) ? r.questions : [];
          if (qs.length === 0) continue;

          // Pick ONE RANDOM question per round.
          const q = qs[Math.floor(Math.random() * qs.length)];

          flattened.push({
            slotId: r.slotId,
            
            // ── PASS ALL MEDIA DOWN TO THE UI ──
            // Check both `q` and `r` because L2 puts lyrics inside the question,
            // while L1 might put it on the round itself.
            clip: q.clip || r.clip,                  
            lyrics: q.lyrics || r.lyrics,            
            revealClip: q.revealClip || r.revealClip, 
            source: q.source || r.source,            
            
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correctValue: q.correctValue,
          });
        } else {
          flattened.push({
            ...r,
            type:         r.type ?? r.question?.type,
            prompt:       r.question?.prompt ?? r.prompt,
            options:      r.question?.options ?? r.options,
            correctValue: r.question?.correctValue ?? r.correctValue,
            // Ensure L1 passes media properly too
            lyrics:       r.lyrics ?? r.question?.lyrics,
            revealClip:   r.revealClip ?? r.question?.revealClip,
            source:       r.source ?? r.question?.source,
          });
        }
      }

      if (flattened.length === 0) {
        throw new Error('No sudden-death questions available in this scope');
      }

      setQuestions(flattened);
    } catch (e) {
      if (token !== fetchTokenRef.current) return;
      setError(e?.message ?? 'Failed to load sudden-death questions');
      setPhase('error');
      return;
    }

    setQIndex(0);
    setPlayerIndex(0);
    setDraft('');
    setLastCommitted(null);
    setPhase('answering');
  }, [apiParams]);

  useEffect(() => {
    fetchBatch();
    return () => { fetchTokenRef.current++; };
  }, [fetchBatch]);

  const currentQuestion = questions[qIndex] ?? null;
  const currentPlayerId = playerIds[playerIndex] ?? null;

  const currentQuestionAnswers = useMemo(
    () => answers?.[batchIndex]?.[qIndex] ?? {},
    [answers, batchIndex, qIndex]
  );

  const totals = useMemo(
    () => playerIds.map(id => ({ id, score: scores[id] ?? 0 })),
    [playerIds, scores]
  );

  function evaluateLeader(snapshot) {
    const entries = playerIds.map(id => ({ id, score: snapshot[id] ?? 0 }));
    entries.sort((a, b) => b.score - a.score);
    const top = entries[0]?.score ?? 0;
    const leaders = entries.filter(e => e.score === top);
    if (leaders.length === 1) {
      return { kind: 'winner', winnerId: leaders[0].id, scores: entries };
    }
    return { kind: 'tied', leaders: leaders.map(l => l.id), scores: entries };
  }

  function leaderIsUncatchable(snapshot, questionsLeft) {
    if (questionsLeft <= 0) return false;
    const sorted = playerIds
      .map(id => ({ id, score: snapshot[id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    const leader = sorted[0];
    const second = sorted[1];
    if (!leader || !second) return false;
    return leader.score - second.score > questionsLeft;
  }

  const commitAnswer = useCallback((typed) => {
    if (phase !== 'answering') return;
    const pid = playerIds[playerIndex];
    if (!pid) return;

    const trimmed = String(typed ?? '');

    const nextAnswers = {
      ...answers,
      [batchIndex]: {
        ...(answers[batchIndex] ?? {}),
        [qIndex]: {
          ...((answers[batchIndex] ?? {})[qIndex] ?? {}),
          [pid]: trimmed,
        },
      },
    };
    setAnswers(nextAnswers);

    setLastCommitted({ playerId: pid, typed: trimmed });
    setDraft('');

    const isLastPlayer = playerIndex + 1 >= playerCount;

    if (!isLastPlayer) {
      setPhase('handoff');
      return;
    }

    const q = questions[qIndex];
    let nextScores = scores;
    if (q) {
      const bucket = nextAnswers[batchIndex][qIndex] ?? {};
      const updated = { ...scores };
      let anyCorrect = false;
      for (const id of playerIds) {
        const typedVal = bucket[id];
        if (typedVal == null) continue;
        if (isCorrectForQuestion(q, typedVal)) {
          updated[id] = (updated[id] ?? 0) + 1;
          anyCorrect = true;
        }
      }
      if (anyCorrect) {
        nextScores = updated;
        setScores(updated);
      }
    }

    const remaining = questions.length - (qIndex + 1);
    if (remaining > 0 && leaderIsUncatchable(nextScores, remaining)) {
      setPhase('finished');
      return;
    }

    setPhase('reveal');
  }, [
    phase, playerIds, playerIndex, playerCount,
    answers, batchIndex, qIndex, questions, scores,
  ]);

  const advanceToNextPlayer = useCallback(() => {
    if (phase !== 'handoff') return;
    setPlayerIndex(i => i + 1);
    setLastCommitted(null);
    setPhase('answering');
  }, [phase]);

  const nextQuestion = useCallback(() => {
    if (phase !== 'reveal') return;

    const remaining = questions.length - (qIndex + 1);
    if (remaining > 0 && leaderIsUncatchable(scores, remaining)) {
      setPhase('finished');
      return;
    }

    if (qIndex + 1 < questions.length) {
      setQIndex(i => i + 1);
      setPlayerIndex(0);
      setLastCommitted(null);
      setPhase('answering');
      return;
    }

    const result = evaluateLeader(scores);
    if (result.kind === 'winner') {
      setPhase('finished');
    } else {
      setPhase('batch-done');
    }
  }, [phase, qIndex, questions.length, scores, playerIds]);

  const nextBatch = useCallback(() => {
    if (phase !== 'batch-done') return;
    setBatchIndex(b => b + 1);
    fetchBatch();
  }, [phase, fetchBatch]);

  const retry = useCallback(() => {
    fetchBatch();
  }, [fetchBatch]);

  return {
    phase,
    error,
    questions,
    currentQuestion,
    currentPlayerId,
    playerIndex,
    playerCount,
    qIndex,
    batchIndex,
    scores,
    answers,
    currentQuestionAnswers,
    lastCommitted,
    draft,
    setDraft,
    commitAnswer,
    advanceToNextPlayer,
    nextQuestion,
    nextBatch,
    retry,
    totals,
    isLastPlayer: playerIndex + 1 >= playerCount,
    isLastQuestion: qIndex + 1 >= questions.length,
  };
}

export function timeoutAnswer() {
  return '';
}