// game/src/routes/PlayMulti.jsx
import { useMultiplayerParams } from '@/hooks/rounds/useMultiplayerParams.js';
import { useMultiplayerSession } from '@/hooks/rounds/useMultiplayerSession.js';
import { Loader } from '@/components/ui/Loader.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { PromptSource } from '@/components/domain/Rounds/PromptSource.jsx';
import { AudioPlayer } from '@/components/domain/Rounds/AudioPlayer.jsx';
import { QuestionCard } from '@/components/domain/Rounds/QuestionCard.jsx';
import { ErrorBlock } from '@/components/domain/Rounds/ErrorBlock.jsx';
import { EmptyBlock } from '@/components/domain/Rounds/EmptyBlock';
import { TimerBar } from '@/components/domain/Setup/Timer/Timerbar.jsx';
import { useRoundReversal } from '@/hooks/rounds/useRoundReversal.js';
import { TurnBanner } from '@/components/domain/Multiplayer/TurnBanner.jsx';
import { PlayerBadge } from '@/components/domain/Multiplayer/PlayerBadge.jsx';
import { useRoundMultiplayer } from '@/hooks/rounds/useRoundMultiPlayer.js';
import { Leaderboard } from '@/components/domain/Multiplayer/LeaderBoard.jsx';
import { MultiplayerProgress } from '@/components/domain/Multiplayer/MultiplayerProgress.jsx';

const POSITION_LABELS = {
  start: 'البداية',
  middle: 'المنتصف',
  end: 'النهاية',
  custom: 'مقطع مخصص',
};

export default function PlayMulti() {
  const params = useMultiplayerParams();

   const { data, isLoading, error } = useRoundMultiplayer({
    genres: params.genres,
    artists: params.artists,
    years: params.years,
    types: params.types,
    players: params.players,
    level: params.level,
    roundsPerPlayer: params.roundsPerPlayer,
    rendition: params.rendition,
    instruments: params.instruments,
  });

  const playerRounds = data?.players ?? [];

  const session = useMultiplayerSession({
    players: params.players,
    playerRounds,
    timerSeconds: params.timerSeconds,
  });

  const reversal = useRoundReversal(params.reversed, session.roundIndex);

  if (isLoading) {
    return (
      <BorderContainer border="all" className="p-8">
        <Loader variant="page" label="Preparing multiplayer rounds…" />
      </BorderContainer>
    );
  }

  if (error) return <ErrorBlock error={error} />;
  if (playerRounds.length === 0) return <EmptyBlock />;

    const buildSuddenDeathUrl = (mode, winnerNames) => {
      // Build the payload from the current game params
      const payload = {
        genres: params.genres,
        artists: params.artists,
        years: params.years,
        types: params.types,
        rendition: params.rendition,
        instruments: params.instruments,
        answerMode: mode === 'options' ? 'choose' : 'type',
        players: winnerNames,
        level: params.level, // Keep the same level for sudden death
      };

      // Save to sessionStorage
      sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));
      
      // Navigate
      return '/sudden-death';
    };
  if (session.phase === 'game-end') {
    return (
      <Leaderboard
        players={params.players}
        scores={session.scores}
        onReplay={() => window.location.reload()}
        buildSuddenDeathUrl={buildSuddenDeathUrl}
      />
    );
  }

  
  if (session.phase === 'turn-intro') {
    return (
      <TurnBanner
        playerName={session.currentPlayerName}
        roundNumber={session.roundNumber}
        totalRounds={session.totalRounds}
        onStart={session.startTurn}
      />
    );
  }

  // phase === 'playing'
  const q = session.currentQuestion;
  const labelFor = (opt) =>
    q.type === 'name-position'
      ? POSITION_LABELS[opt.value] ?? opt.label
      : opt.label;

  const revealClip = session.currentRound?.revealClip;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PlayerBadge
          currentIndex={session.currentPlayerIndex}
          players={params.players}
          scores={session.scores}
        />
        <span className="text-xs text-ink-subtle tabular-nums">
          Round {session.roundNumber} / {session.totalRounds}
        </span>
      </div>

      <MultiplayerProgress
        players={params.players}
        scores={session.scores}
        roundScores={session.roundScores}
        totalRounds={session.totalRounds}
        roundIndex={session.roundIndex}
        currentPlayerIndex={session.currentPlayerIndex}
      />

      <BorderContainer border="all" className="p-6 space-y-6">
        {session.hasTimer && (
          <TimerBar
            timeLeft={session.timeLeft}
            total={params.timerSeconds}
            timedOut={session.timedOut}
          />
        )}

        <PromptSource round={session.currentRound} />

        <QuestionCard
          eyebrow={q.type.replace('name-', '').replace('lyrics-', '')}
          prompt={q.prompt}
          options={q.options}
          correctValue={q.correctValue}
          picked={session.picked}
          revealed={session.revealed}
          onPick={session.pick}
          onNext={session.next}
          nextLabel={session.isLastQuestionOverall ? 'See final scores' : 'Next →'}
          labelFor={labelFor}
          answerMode={params.answerMode}
          questionType={q.type}
          source={session.currentRound?.source}
          reversal={reversal}
          revealExtra={revealClip ? <AudioPlayer src={revealClip.serveUrl} /> : null}
        />
      </BorderContainer>
    </div>
  );
}