// game/src/routes/SuddenDeath.jsx
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuddenDeath, isCorrectForQuestion } from '@/hooks/sudden-death/useSuddenDeath.js';
import { useQuestionTimer } from '@/hooks/sudden-death/useQuestionTimer.js';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { PlayerBadge } from '@/components/domain/Multiplayer/PlayerBadge.jsx';
import { SuddenDeathProgress } from '@/components/domain/SuddenDeath/SuddenDeathProgress.jsx';
import { SuddenDeathQuestionCard } from '@/components/domain/SuddenDeath/SuddenDeathQuestionCard.jsx';
import PassAndPlayInput from '@/components/domain/SuddenDeath/PassAndPlayInput.jsx';
import SuddenDeathReveal from '@/components/domain/SuddenDeath/SuddenDeathReveal.jsx';
import SuddenDeathResult from '@/components/domain/SuddenDeath/SuddenDeathResult.jsx';
import { usePlayParams } from '@/hooks/rounds/usePlayParams';

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

const OPTIONS_TIMER_SECONDS = 20;

function typeEyebrow(type) {
  if (!type) return '';
  return type.replace('name-', '').replace('lyrics-', 'lyrics ');
}

export default function SuddenDeath() {
  const navigate = useNavigate();
  const params = usePlayParams();

  const playerIds = params.players || [];

  if (playerIds.length < 2) {
    navigate('/setup', { replace: true });
    return null;
  }

  const playerLabels = useMemo(() => {
    const map = {};
    playerIds.forEach(id => { map[id] = id; });
    return map;
  }, [playerIds]);

  const playerNames = playerIds;
  const mode = params.answerMode === 'type' ? 'typed' : 'options';
  const returnTo = '/setup';

  const apiParams = useMemo(() => ({
    genres: params.genres,
    artists: params.artists,
    years: params.years,
    types: params.types,
    rendition: params.rendition,
    instruments: params.instruments,
    count: params.count || 10,
    players: playerIds,
    level: params.level || 1,
  }), [
    params.genres,
    params.artists,
    params.years,
    params.types,
    params.rendition,
    params.instruments,
    params.count,
    playerIds,
    params.level,
  ]);

  const sd = useSuddenDeath({ playerIds, apiParams });

  const currentPlayerRevealed =
    sd.lastCommitted?.playerId === sd.currentPlayerId;

  const handleTimeout = useCallback(() => {
    if (sd.phase !== 'answering') return;
    sd.commitAnswer('');
  }, [sd]);

  const { timeLeft, timedOut } = useQuestionTimer({
    seconds: OPTIONS_TIMER_SECONDS,
    paused: mode !== 'options'
        || sd.phase !== 'answering'
        || currentPlayerRevealed,
    resetKey: `${sd.batchIndex}-${sd.qIndex}-${sd.playerIndex}`,
    onTimeout: handleTimeout,
  });

  const currentIsPublic = sd.phase === 'reveal'
    || sd.phase === 'batch-done'
    || sd.phase === 'finished';

  const perQuestion = {};
  for (let i = 0; i < sd.questions.length; i++) {
    const q = sd.questions[i];
    const answersForQ = sd.answers?.[sd.batchIndex]?.[i] ?? {};
    const row = {};
    for (const pid of playerIds) {
      const typed = answersForQ[pid];
      if (typed == null) { row[pid] = null; continue; }
      const isPast = i < sd.qIndex;
      const isCurrent = i === sd.qIndex;
      const isPublic = isPast || (isCurrent && currentIsPublic);
      row[pid] = isPublic
        ? (isCorrectForQuestion(q, typed) ? 'correct' : 'wrong')
        : 'answered';
    }
    perQuestion[i] = row;
  }

  const progressScores = playerIds.map(id => sd.scores[id] ?? 0);

  if (sd.phase === 'loading') {
    return (
      <BorderContainer border="all" className="p-8 max-w-2xl mx-auto">
        <p className="text-center text-ink-muted">
          Loading sudden-death questions…
        </p>
      </BorderContainer>
    );
  }

  if (sd.phase === 'error') {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-6">
        <p className="text-wrong">{sd.error}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={sd.retry}
            className="rounded-md bg-accent text-bg px-5 py-2 hover:bg-accent-2 transition-colors"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-border bg-surface-2 text-ink px-5 py-2 hover:bg-surface transition-colors"
          >
            Back
          </button>
        </div>
      </BorderContainer>
    );
  }

  if (sd.phase === 'finished' || sd.phase === 'batch-done') {
    const topScore = Math.max(...sd.totals.map(t => t.score));
    const winnerId =
      sd.phase === 'finished'
        ? sd.totals.find(t => t.score === topScore)?.id
        : null;

    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto">
        <SuddenDeathResult
          phase={sd.phase}
          totals={sd.totals}
          winnerId={winnerId}
          playerLabels={playerLabels}
          onNextBatch={sd.nextBatch}
          onPlayAgain={() => navigate(returnTo)}
          onExit={() => navigate('/')}
        />
      </BorderContainer>
    );
  }

  const q = sd.currentQuestion;
  const isHandoff = sd.phase === 'handoff';
  const nextPlayerId = isHandoff ? playerIds[sd.playerIndex + 1] : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PlayerBadge
          currentIndex={sd.playerIndex}
          players={playerNames}
          scores={progressScores}
        />
        <span className="text-xs text-ink-subtle tabular-nums">
          Q{sd.qIndex + 1} / {sd.questions.length}
        </span>
      </div>

      <SuddenDeathProgress
        players={playerNames}
        scores={progressScores}
        perQuestion={perQuestion}
        playerIds={playerIds}
        totalQuestions={sd.questions.length}
        qIndex={sd.qIndex}
        playerIndex={sd.playerIndex}
        phase={sd.phase}
      />

      {sd.phase === 'reveal' ? (
        <BorderContainer border="all" className="p-6 space-y-6">
          {(q?.clip || q?.lyrics) && <PromptSource round={q} />}
          <SuddenDeathReveal
            question={q}
            answers={sd.currentQuestionAnswers}
            playerIds={playerIds}
            playerLabels={playerLabels}
            totals={sd.totals}
            isLastQuestion={sd.isLastQuestion}
            onNext={sd.nextQuestion}
          />
        </BorderContainer>
      ) : isHandoff ? (
        <BorderContainer border="all" className="p-6">
          <PassAndPlayInput
            phase="handoff"
            currentPlayerId={sd.currentPlayerId}
            nextPlayerId={nextPlayerId}
            playerLabels={playerLabels}
            draft={sd.draft}
            setDraft={sd.setDraft}
            onCommit={sd.commitAnswer}
            onReady={sd.advanceToNextPlayer}
            prompt={null}
            eyebrow={null}
          />
        </BorderContainer>
      ) : mode === 'options' ? (
        <>
          {(q?.clip || q?.lyrics) && (
            <BorderContainer border="all" className="p-6">
              <PromptSource round={q} />
            </BorderContainer>
          )}
          <BorderContainer border="all" className="p-6">
            <SuddenDeathQuestionCard
              eyebrow={typeEyebrow(q?.type)}
              prompt={q?.prompt}
              options={q?.options ?? []}
              correctValue={q?.correctValue}
              questionType={q?.type}
              source={q?.source}
              picked={currentPlayerRevealed ? sd.lastCommitted?.typed : null}
              revealed={currentPlayerRevealed}
              onPick={(value) => { sd.commitAnswer(value); }}
              onNext={sd.advanceToNextPlayer}
              timeLeft={timeLeft}
              totalSeconds={OPTIONS_TIMER_SECONDS}
              timedOut={timedOut}
              labelFor={(o) =>
                q?.type === 'name-position'
                  ? POSITION_LABELS[o.value] ?? o.label
                  : o.label
              }
            />
          </BorderContainer>
        </>
      ) : (
        <>
          {(q?.clip || q?.lyrics) && (
            <BorderContainer border="all" className="p-6">
              <PromptSource round={q} />
            </BorderContainer>
          )}
          <BorderContainer border="all" className="p-6">
            <PassAndPlayInput
              phase={sd.phase}
              currentPlayerId={sd.currentPlayerId}
              nextPlayerId={null}
              playerLabels={playerLabels}
              draft={sd.draft}
              setDraft={sd.setDraft}
              onCommit={sd.commitAnswer}
              onReady={sd.advanceToNextPlayer}
              prompt={
                q?.type === 'name-position'
                  ? 'أين يقع هذا المقطع من الأغنية؟'
                  : q?.prompt
              }
              eyebrow={typeEyebrow(q?.type)}
            />
            {q?.type === 'name-position' && (
              <div className="mt-4 text-center text-xs text-ink-subtle">
                {Object.values(POSITION_LABELS).map(v => (
                  <span key={v} className="mx-1">{v}</span>
                ))}
              </div>
            )}
          </BorderContainer>
        </>
      )}
    </div>
  );
}