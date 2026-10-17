// game/src/routes/Sporcle/Play.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BorderContainer } from '../../components/layout/BorderContainer.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Loader } from '../../components/ui/Loader.jsx';
import { PlayerRoster } from '../../components/domain/Sporcle/PlayerRoster.jsx';
import { SporcleProgress } from '../../components/domain/Sporcle/SporcleProgress.jsx';
import { SporcleTimer } from '../../components/domain/Sporcle/SporcleTimer.jsx';
import { QuestionPanel } from '../../components/domain/Sporcle/QuestionPanel.jsx';
import { PromptSource } from '../../components/domain/Rounds/PromptSource.jsx';
import { SporcleModal } from '../../components/domain/Setup/Modals/SporcleModal.jsx';
import { useHostSporcle } from '../../hooks/sporcle/useHostSporcle.js';
import { useHostSporcleIdentity } from '../../hooks/sporcle/useHostSporcleIdentity.js';
import { useHostSporcleActions } from '../../hooks/sporcle/useHostSporcleActions.js';
import { useRoundReversal } from '../../hooks/rounds/useRoundReversal.js';
import { sporcleApi } from '../../lib/sporcleApi.js';
import { useRoomProfiles } from '../../hooks/sporcle/useRoomProfiles.js';

export default function SporclePlay() {
  const { code } = useParams();
  const navigate = useNavigate();
  const normalizedCode = (code ?? '').toUpperCase();

  const { identity , saveForCode  } = useHostSporcleIdentity(normalizedCode);
  const { state, loading, error, refresh } = useHostSporcle(normalizedCode);
  const actions = useHostSporcleActions(normalizedCode, {
    onVersion: () => refresh(),
  });
  const profilesById = useRoomProfiles(state?.players ?? []);

  const myId = identity?.playerId ?? null;

  /* ── Modal management ─────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(true);
  const [modalMode, setModalMode] = useState('join');

  useEffect(() => {
    if (!state) return;

    const preGame =
      state.phase === 'lobby' ||
      state.phase === 'loading' ||
      state.phase === 'countdown';

    if (!identity) {
      setModalMode('join');
      setModalOpen(true);
      return;
    }

    if (preGame) {
      setModalMode('room');
      setModalOpen(true);
      return;
    }

    setModalOpen(false);
  }, [identity, state?.phase, state]);

  // Redirect to result once finished.
  useEffect(() => {
    if (state?.phase === 'finished') {
      navigate(`/sporcle/result/${normalizedCode}`, { replace: true });
    }
  }, [state?.phase, navigate, normalizedCode]);

  // Hide the global header while the player is actually in a round.
  useEffect(() => {
    const inGame =
      state?.phase === 'question' ||
      state?.phase === 'reveal';

    if (inGame) document.body.classList.add('hide-header');
    else        document.body.classList.remove('hide-header');

    return () => document.body.classList.remove('hide-header');
  }, [state?.phase]);
    
  /* ── Auto-rejoin ───────────────────────────────────────── */
  const rejoinedRef = useRef(false);

  useEffect(() => {
    if (rejoinedRef.current) return;
    if (!myId || !state?.players) return;

    const me = state.players.find((p) => p.id === myId);
    if (!me) return;
    if (!me.left) return;

    rejoinedRef.current = true;
    actions.rejoin(myId).catch(() => {
      rejoinedRef.current = false;
    });
  }, [myId, state?.players, actions]);

  // Leave beacon on tab close.
  const leftRef = useRef(false);
  useEffect(() => {
    function handleUnload() {
      if (leftRef.current || !myId) return;
      sporcleApi.leaveBeacon(normalizedCode, myId);
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [normalizedCode, myId]);

  /* ── Per-question correctness accumulator ────────────── */
  const [answersByQ, setAnswersByQ] = useState({});

  useEffect(() => {
    if (state?.phase !== 'reveal' || !state.reveal) return;

    const q = state.reveal.idx;
    const answers = state.reveal.answers ?? [];

    setAnswersByQ((prev) => {
      if (prev[q]) return prev;

      const next = { ...prev };
      next[q] = {};
      for (const a of answers) {
        next[q][a.playerId] = a.correct ? 'correct' : 'wrong';
      }
      return next;
    });
  }, [state?.phase, state?.reveal?.idx, state?.reveal]);

  // Reversal per question.
  const reversal = useRoundReversal(state?.reversed ?? 'no', state?.qIndex ?? 0);

  // Answer state.
  const [myPick, setMyPick] = useState(null);
  useEffect(() => {
    setMyPick(null);
  }, [state?.qIndex, state?.phase]);

  const revealAnswers = state?.reveal?.answers ?? [];
  const myRevealAnswer = useMemo(
    () => revealAnswers.find((a) => a.playerId === myId) ?? null,
    [revealAnswers, myId]
  );
  const effectivePick = state?.phase === 'reveal'
    ? (myRevealAnswer?.typed ?? null)
    : myPick;

  /* ── Modal close handler ───────────────────────────────── */
  function handleModalClose() {
    setModalOpen(false);
    navigate('/setup');
  }

  /* ── Render ─────────────────────────────────────────────── */

  const modal = modalOpen ? (
    <SporcleModal
      open
      onClose={handleModalClose}
      initialMode={modalMode}
      code={normalizedCode}
      state={state}
      actions={actions}
      myId={myId}
      profilesById={profilesById}
      onIdentitySet={saveForCode}
    />
  ) : null;

  if (loading && !state) {
    return (
      <>
        {modal}
        <BorderContainer border="all" className="p-8 max-w-lg mx-auto">
          <Loader variant="page" label="Loading…" />
        </BorderContainer>
      </>
    );
  }

  if (error && !state) {
    return (
      <>
        {modal}
        <BorderContainer border="all" className="p-8 max-w-lg mx-auto space-y-4 text-center">
          <p className="text-wrong">{error.message}</p>
          <Button variant="secondary" onClick={() => navigate('/setup')}>
            Back to setup
          </Button>
        </BorderContainer>
      </>
    );
  }

  if (!state) return modal;

  // Every pre-game phase renders inside the modal.
  if (
    state.phase === 'lobby' ||
    state.phase === 'loading' ||
    state.phase === 'countdown'
  ) {
    return modal;
  }

  // In-game
  const me = state.players.find((p) => p.id === myId);
  const isHost = !!me?.isHost;
  const inQuestion = state.phase === 'question';
  const inReveal = state.phase === 'reveal';

  // Sudden Death timer is 15s. Normal is 20s.
  const timerSeconds = state.isTieBreaker ? 15 : 20;

  async function handlePick(value) {
    if (!inQuestion || myPick != null) return;
    setMyPick(value);
    try {
      await actions.answer(myId, value);
    } catch {
      setMyPick(null);
    }
  }

  async function handleAdvance() {
    try {
      await actions.advance(myId);
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-xs text-ink-subtle uppercase tracking-[0.2em]">
          {state.mode === 'speed' ? 'Speed' : 'Collect'}
        </span>
        <span className="text-xs text-ink-muted tabular-nums">
          Q {Math.min(state.qIndex + 1, state.totalQuestions)} / {state.totalQuestions}
        </span>
      </div>

      {/* SUDDEN DEATH BANNER */}
      {state.isTieBreaker && (
        <div className="rounded-md border border-wrong bg-wrong-soft px-4 py-3 text-center">
          <p className="text-sm font-bold text-wrong uppercase tracking-wider">
            Sudden Death
          </p>
          <p className="text-xs text-ink-muted mt-1">
            First to answer correctly wins.
          </p>
        </div>
      )}

      {inQuestion && (
        <PlayerRoster
          players={state?.players ?? []}
          phase={state?.phase ?? 'lobby'}
          myId={myId}
          profilesById={profilesById}
        />
      )}
      {inReveal && (
        <SporcleProgress
          players={state?.players ?? []}
          totalQuestions={state?.totalQuestions ?? 0}
          qIndex={state?.qIndex ?? 0}
          phase={state?.phase ?? 'lobby'}
          answersByQ={answersByQ}
          myId={myId}
          profilesById={profilesById}
        />
      )}

      {(inQuestion || inReveal) && (
        <BorderContainer border="all" className="p-6 space-y-6">
          {inQuestion && (state.question?.clip || state.question?.lyrics) && (
            <PromptSource round={state.question} />
          )}

          {inQuestion && (
            <SporcleTimer deadline={state.deadline} totalSeconds={timerSeconds} />
          )}

          <QuestionPanel
            question={state.question ?? state.reveal}
            reveal={state.reveal}
            phase={state.phase}
            myId={myId}
            myPick={effectivePick}
            onPick={handlePick}
            reversal={reversal}
            rendition={state.rendition ?? 'forward'}
          />
        </BorderContainer>
      )}

      {inReveal && isHost && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleAdvance}
            disabled={actions.pending === 'advance'}
          >
            {actions.pending === 'advance'
              ? 'Advancing…'
              : state.qIndex + 1 >= state.totalQuestions
              ? state.isTieBreaker 
                ? 'Show final winner'
                : 'See final scores'
              : 'Next question →'}
          </Button>
        </div>
      )}

      {inReveal && !isHost && state.autoAdvanceSeconds > 0 && (
        <p className="text-center text-xs text-ink-subtle">
          Next question in a moment…
        </p>
      )}
    </div>
  );
}