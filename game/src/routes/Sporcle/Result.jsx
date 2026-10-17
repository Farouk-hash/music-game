// game/src/routes/Sporcle/Result.jsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BorderContainer } from '../../components/layout/BorderContainer.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Loader } from '../../components/ui/Loader.jsx';
import { useHostSporcle } from '../../hooks/sporcle/useHostSporcle.js';
import { useHostSporcleIdentity } from '../../hooks/sporcle/useHostSporcleIdentity.js';
import { useHostSporcleActions } from '../../hooks/sporcle/useHostSporcleActions.js';
import { useRoomProfiles } from '../../hooks/sporcle/useRoomProfiles.js';
import { PlayerAvatar } from '../../components/Avatar/PlayerAvatar.jsx';
import { FollowRing } from '../../components/Avatar/FollowRing.jsx';
import { FollowButton } from '../../components/domain/Follow/FollowButton.jsx';

export default function SporcleResult() {
  const { code } = useParams();
  const navigate = useNavigate();
  const normalizedCode = (code ?? '').toUpperCase();

  const { identity } = useHostSporcleIdentity(normalizedCode);
  const { state, loading, error, refresh } = useHostSporcle(normalizedCode);
  const actions = useHostSporcleActions(normalizedCode, { onVersion: () => refresh() });

  const myId = identity?.playerId ?? null;

  const profilesById = useRoomProfiles(state?.players ?? []);

  // If we somehow land here before the game is done, route to Play.
  useEffect(() => {
    if (!state) return;
    if (state.phase !== 'finished') {
      navigate(`/sporcle/play/${normalizedCode}`, { replace: true });
    }
  }, [state?.phase, navigate, normalizedCode]);

  if (loading && !state) {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto">
        <Loader variant="page" label="Loading result…" />
      </BorderContainer>
    );
  }

  if (error && !state) {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-wrong">{error.message}</p>
        <Button variant="secondary" onClick={() => navigate('/setup')}>
          Back to setup
        </Button>
      </BorderContainer>
    );
  }

  if (!state?.finished) return null;

  const { finished, players } = state;
  const { winnerId, standings } = finished;

  const me = players.find((p) => p.id === myId);
  const isHost = !!me?.isHost;
  const winner = winnerId ? standings.find((s) => s.playerId === winnerId) : null;

  // Map from playerId → profile, so standings rows can find their avatar.
  const profileByPlayerId = new Map();
  for (const p of players) {
    if (p.profileId && profilesById.has(p.profileId)) {
      profileByPlayerId.set(p.id, profilesById.get(p.profileId));
    }
  }

  const winnerProfile = winner ? profileByPlayerId.get(winner.playerId) ?? null : null;

  async function handlePlayAgain() {
    try {
      await actions.reset(myId);
      navigate(`/sporcle/play/${normalizedCode}`, { replace: true });
    } catch {}
  }

  return (
    <div className="space-y-8 max-w-lg mx-auto pb-24">
      <BorderContainer border="all" className="p-10 text-center space-y-4">
        {winner ? (
          <div className="flex justify-center">
            <PlayerAvatar
              seed={winner.name}
              avatar={winnerProfile}
              size={72}
              ring="ring-correct"
            />
          </div>
        ) : (
          <div className="text-5xl">🤝</div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {winner ? `${winner.name} wins!` : "It's a tie!"}
          </h1>
          {state.isTieBreaker && (
            <p className="text-xs font-semibold text-wrong uppercase tracking-widest mt-1">
              Won by Sudden Death
            </p>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          {standings.length} players · {finished.perQuestion.length} questions
        </p>
      </BorderContainer>

      <BorderContainer border="all" className="p-6 space-y-3">
        <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Final standings
        </h2>
        <ul className="space-y-2">
          {standings.map((s, i) => {
            const isWinner = s.playerId === winnerId;
            const isMe = s.playerId === myId;
            const profile = profileByPlayerId.get(s.playerId) ?? null;
            return (
              <li
                key={s.playerId}
                className={[
                  'flex items-center gap-3 rounded-md border px-4 py-3',
                  isWinner
                    ? 'border-correct bg-correct-soft'
                    : 'border-border bg-surface-2',
                ].join(' ')}
              >
                <span className="w-6 text-sm font-semibold text-ink-subtle tabular-nums">
                  {i + 1}
                </span>

                <FollowRing
                  profileId={s.profileId}
                  seed={s.name}
                  avatar={profile}
                  size={32}
                  ring={isWinner ? 'ring-correct' : isMe ? 'ring-accent' : undefined}
                />

                <span className="flex-1 truncate text-ink font-medium" dir="auto">
                  {s.name}
                  {isMe && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">
                      you
                    </span>
                  )}
                </span>
                <span
                  className={[
                    'font-semibold tabular-nums',
                    isWinner ? 'text-correct' : 'text-ink',
                  ].join(' ')}
                >
                  {s.score}
                </span>

                {!isMe && s.profileId && (
                  <FollowButton
                    profileId={s.profileId}
                    size="sm"
                    friendsOnly="hidden"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </BorderContainer>

      {isHost && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={handlePlayAgain}>
            Play again →
          </Button>
        </div>
      )}

      {!isHost && (
        <p className="text-center text-xs text-ink-subtle">
          Waiting for the host to start another round…
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate('/setup')}
        className="block mx-auto text-xs text-ink-subtle hover:text-ink"
      >
        ← Back to setup
      </button>
    </div>
  );
}