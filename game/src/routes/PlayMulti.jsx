// game/src/routes/PlayMulti.jsx
import { useNavigate } from 'react-router-dom';
import { useMultiplayerParams } from '../hooks/useMultiplayerParams.js';
import { useMultiplayerSession } from '../hooks/useMultiplayerSession.js';
import { Loader } from '../components/ui/Loader.jsx';
import { BorderContainer } from '../components/layout/BorderContainer.jsx';
import { PromptSource } from '../components/domain/Rounds/PromptSource.jsx';
import { AudioPlayer } from '../components/domain/Rounds/AudioPlayer.jsx';
import { QuestionCard } from '../components/domain/Rounds/QuestionCard.jsx';
import { ErrorBlock } from '../components/domain/Rounds/ErrorBlock.jsx';
import { EmptyBlock } from '../components/domain/Rounds/EmptyBlock.jsx';
import { TimerBar } from '../components/domain/Setup/Timer/Timerbar.jsx';
import { useRoundReversal } from '../hooks/useRoundReversal.js';
import { TurnBanner } from '../components/domain/Multiplayer/TurnBanner.jsx';
import { PlayerBadge } from '../components/domain/Multiplayer/PlayerBadge.jsx';
import { useRoundMultiplayer } from '../hooks/useRoundMultiPlayer.js';
import { Leaderboard } from '../components/domain/Multiplayer/LeaderBoard.jsx';
import { MultiplayerProgress } from '../components/domain/Multiplayer/MultiplayerProgress.jsx';

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
    roundsPerPlayer: params.count,
    rendition: params.rendition,
    instruments:params.instruments
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
    const qp = new URLSearchParams();

    if (params.genres?.length)  qp.set('genres',  params.genres.join(','));
    if (params.artists?.length) qp.set('artists', params.artists.join(','));
    if (params.years?.length)   qp.set('years',   params.years.join(','));
    if (params.types?.length)   qp.set('types',   params.types.join(','));
    if (params.rendition)       qp.set('rendition', params.rendition);
    if (params.instruments && params.instruments !== 'none') {
      qp.set('instruments', params.instruments);
    }

    // Sudden death roster = the tied winners only.
    qp.set('players', winnerNames.join(','));
    qp.set('labels',  winnerNames.join(','));
    qp.set('returnTo', window.location.pathname + window.location.search);
    qp.set('mode', mode);

    return `/sudden-death?${qp.toString()}`;
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