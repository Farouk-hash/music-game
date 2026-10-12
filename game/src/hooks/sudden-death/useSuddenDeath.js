// game/src/hooks/useSuddenDeath.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { isAnswerCorrect } from '../answerCheck';

const QUESTIONS_PER_BATCH = 5;

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

/**
 * For `name-position` questions, both the player's typed answer and the
 * correct value can be English ('start') or Arabic ('البداية'). Map both
 * to the same canonical form (the English key) before comparing.
 */
function canonicalPosition(raw) {
  const s = String(raw ?? '').trim();
  for (const [en, ar] of Object.entries(POSITION_LABELS)) {
    if (s === en || s === ar) return en;
  }
  return s;
}

/**
 * Unified correctness check — same logic used by the reveal screen, so
 * score and display never disagree.
 */
export function isCorrectForQuestion(question, typed) {
  if (typed == null || typed === '') return false;
  if (question?.type === 'name-position') {
    return canonicalPosition(typed) === canonicalPosition(question.correctValue);
  }
  return isAnswerCorrect(typed, question?.correctValue);
}

/**
 * Drives the sudden-death tiebreaker flow.
 *
 * Phases:
 *   loading    → fetching a batch of 5 questions
 *   answering  → current player types + taps eye (commit + hide)
 *   handoff    → "pass to Player N" screen
 *   reveal     → after every player has answered the current question
 *   batch-done → after the batch, if still tied → another batch
 *   finished   → a single leader emerged (possibly early)
 *   error      → fetch failed
 *
 * @param {object}   opts
 * @param {string[]} opts.playerIds  — stable IDs, e.g. ['Ali','Raffat']
 * @param {object}   opts.apiParams  — passthrough for /game/round
 */
export function useSuddenDeath({ playerIds, apiParams }) {
  const playerCount = playerIds.length;

  const [phase, setPhase]               = useState('loading');
  const [error, setError]               = useState(null);
  const [questions, setQuestions]       = useState([]);
  const [batchIndex, setBatchIndex]     = useState(0);
  const [qIndex, setQIndex]             = useState(0);
  const [playerIndex, setPlayerIndex]   = useState(0);
  const [answers, setAnswers]           = useState({}); // [batch][q][playerId] = string
  const [scores, setScores]             = useState(() =>
    Object.fromEntries(playerIds.map(id => [id, 0]))
  );
  const [draft, setDraft]               = useState('');
  const [lastCommitted, setLastCommitted] = useState(null); // { playerId, typed }

  const fetchTokenRef = useRef(0);

  /* ── Fetch a batch ─────────────────────────────────────── */
  const fetchBatch = useCallback(async () => {
    const token = ++fetchTokenRef.current;
    setPhase('loading');
    setError(null);

    try {
      const params = new URLSearchParams({
        count: String(QUESTIONS_PER_BATCH),
        ...(apiParams ?? {}),
      });
      for (const [k, v] of [...params.entries()]) {
        if (v == null || v === '') params.delete(k);
      }

      const data = await api.get(`/round?${params.toString()}`);
      if (token !== fetchTokenRef.current) return; // stale

      const rawRounds = data?.rounds ?? [];
      if (rawRounds.length === 0) {
        throw new Error('No sudden-death questions available in this scope');
      }

     
        // retry a slot with different types. Sudden death plays exactly
        // QUESTIONS_PER_BATCH, so clamp here.
        const rounds = rawRounds
        .slice(0, QUESTIONS_PER_BATCH)
        .map(r => ({
            ...r,
            type:         r.type ?? r.question?.type,
            prompt:       r.question?.prompt ?? r.prompt,
            options:      r.question?.options ?? r.options,
            correctValue: r.question?.correctValue ?? r.correctValue,
        }));
      setQuestions(rounds);
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

  /* ── Derived ───────────────────────────────────────────── */
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

  /* ── Leader evaluation ─────────────────────────────────── */
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

  /**
   * Returns true if the current leader cannot be caught even if every
   * remaining question is scored for the runner-up.
   */
  function leaderIsUncatchable(snapshot, questionsLeft) {
    if (questionsLeft <= 0) return false;
    const sorted = playerIds
      .map(id => ({ id, score: snapshot[id] ?? 0 }))
      .sort((a, b) => b.score - a.score);
    const leader = sorted[0];
    const second = sorted[1];
    if (!leader || !second) return false;
    // Leader can earn at most `questionsLeft` more; so can the second.
    // If the leader's current margin exceeds the number of remaining
    // questions, the second cannot overtake.
    return leader.score - second.score > questionsLeft;
  }

  /* ── Actions ───────────────────────────────────────────── */

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

    // Last player → award points for this question, synchronously.
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

    // Early termination: check if the leader is now uncatchable,
    // given the questions remaining AFTER this one.
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

    // Another early check in case the last player's answer changed
    // nothing but we still want to short-circuit before showing Q(n+1).
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

    // End of batch.
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

  /* ── Public API ────────────────────────────────────────── */
  return {
    // state
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

    // actions
    commitAnswer,
    advanceToNextPlayer,
    nextQuestion,
    nextBatch,
    retry,

    // computed
    totals,
    isLastPlayer: playerIndex + 1 >= playerCount,
    isLastQuestion: qIndex + 1 >= questions.length,
  };
}


/**
 * Commit an empty answer — used when the timer expires.
 * Normalizes to a wrong answer without any special casing.
 */
export function timeoutAnswer() {
  return '';
}