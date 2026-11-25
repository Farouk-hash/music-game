import { useMemo } from 'react';
import { useMultiplayerParams } from '@/hooks/rounds/multiplayers-normal/useMultiplayerParams.js';
import { Loader } from '@/components/ui/Loader.jsx';
import { ErrorBlock } from '@/components/domain/Rounds/ErrorBlock.jsx';
import { EmptyBlock } from '@/components/domain/Rounds/EmptyBlock';
import { TurnBanner } from '@/components/domain/Multiplayer/TurnBanner.jsx';
import { Leaderboard } from '@/components/domain/Multiplayer/LeaderBoard.jsx';
import { HotPotatoRevealScreen } from '@/components/domain/Multiplayer/HotPotato/HotPotatoRevealScreen';
import { useRoundMultiplayer } from '@/hooks/rounds/multiplayers-normal/useRoundMultiplayer.js';
import { useRoundHotPotato } from '@/hooks/rounds/hotpotato/useRoundHotPotato';
import { useMultiplayerSession } from '@/hooks/rounds/multiplayers-normal/useMultiplayerSession.js';
import { useHotPotatoSession } from '@/hooks/rounds/hotpotato/useHotPotatoSession';
import { flattenSharedRounds } from '@/hooks/rounds/hotpotato/flattenSharedRounds';
import { useRoundReversal } from '@/hooks/rounds/features/useRoundReversal.js';
import { HotPotatoPlayingView } from '@/components/domain/Multiplayer/HotPotato/HotPotatoPlayingView.jsx';
import { NormalPlayingView } from '@/components/domain/Multiplayer/Normal/NormalPlayingView.jsx';

const EMPTY = [];

function makeBuildSuddenDeathUrl(params) {
  return (mode, winnerNames) => {
    const payload = {
      genres: params.genres,
      artists: params.artists,
      years: params.years,
      types: params.types,
      rendition: params.rendition,
      instruments: params.instruments,
      answerMode: mode === 'options' ? 'choose' : 'type',
      players: winnerNames,
      level: params.level,
    };
    sessionStorage.setItem('game.lastPlayParams', JSON.stringify(payload));
    return '/sudden-death';
  };
}

export default function PlayMulti() {
  const params = useMultiplayerParams();
  return params.multiplayerMode === 'hotpotato'
    ? <PlayHotPotato params={params} />
    : <PlayMultiNormal params={params} />;
}

/* ═══════════════════════ HOT POTATO ═══════════════════════ */
function PlayHotPotato({ params }) {
  const { data, isLoading, error } = useRoundHotPotato({
    genres: params.genres,
    artists: params.artists,
    years: params.years,
    types: params.types,
    players: params.players,
    level: params.level,
    count: params.roundsPerPlayer,
    rendition: params.rendition,
    instruments: params.instruments,
  });

  const sharedRounds = useMemo(
    () => flattenSharedRounds(data?.rounds ?? EMPTY),
    [data]
  );

  const session = useHotPotatoSession({
    players: params.players,
    sharedRounds,
    timerSeconds: params.timerSeconds,
  });

  const reversal = useRoundReversal(params.reversed, session.trackIndex ?? 0);

  if (isLoading) return <Loader variant="page" label="Preparing Hot Potato rounds…" />;
  if (error) return <ErrorBlock error={error} />;
  if (sharedRounds.length === 0) return <EmptyBlock />;

  if (session.phase === 'game-end') {
    return (
      <Leaderboard
        players={params.players}
        scores={session.aggregatedScores}
        onReplay={() => window.location.reload()}
        buildSuddenDeathUrl={makeBuildSuddenDeathUrl(params)}
      />
    );
  }

  if (session.phase === 'revealing') {
    return (
      <HotPotatoRevealScreen
        players={params.players}
        sharedRounds={sharedRounds}
        hiddenAnswers={session.hiddenAnswers}
        aggregatedScores={session.aggregatedScores}
        onDismiss={() => session.dismissReveal()}
      />
    );
  }

  if (session.phase === 'turn-intro') {
    return (
      <TurnBanner
        playerName={session.currentPlayerName}
        roundNumber={session.trackIndex + 1}
        totalRounds={session.totalTracks}
        onStart={session.startTurn}
      />
    );
  }

  // ✅ PLAYING PHASE - Delegated to sub-component
  return <HotPotatoPlayingView session={session} params={params} reversal={reversal} />;
}

/* ═══════════════════════ NORMAL MULTIPLAYER ═══════════════════════ */
function PlayMultiNormal({ params }) {
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

  if (session.phase === 'game-end') {
    return (
      <Leaderboard
        players={params.players}
        scores={session.scores}
        onReplay={() => window.location.reload()}
        buildSuddenDeathUrl={makeBuildSuddenDeathUrl(params)}
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

  // ✅ PLAYING PHASE - Delegated to sub-component
  return <NormalPlayingView session={session} params={params} reversal={reversal} />;
}