// game/src/routes/Sporcle/Result.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BorderContainer } from '../../components/layout/BorderContainer.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Loader } from '../../components/ui/Loader.jsx';
import { useHostSporcle } from '../../hooks/sporcle/useHostSporcle.js';
import { useHostSporcleIdentity } from '../../hooks/sporcle/useHostSporcleIdentity.js';
import { useHostSporcleActions } from '../../hooks/sporcle/useHostSporcleActions.js';
import { useRoomProfiles } from '../../hooks/sporcle/useRoomProfiles.js';
import { useSporclePresence } from '../../hooks/sporcle/useSporclePresence.js';
import { PlayerAvatar } from '../../components/Avatar/PlayerAvatar.jsx';
import { FollowRing } from '../../components/Avatar/FollowRing.jsx';
import { FollowButton } from '../../components/domain/Follow/FollowButton.jsx';
import { ChatButton } from '../../components/domain/Sporcle/ChatButton.jsx';
import { ChatModal } from '../../components/domain/Sporcle/ChatModal.jsx';
import { ReplaySettingsModal } from '../../components/domain/Sporcle/ReplaySettingsModal.jsx';
import { getLastReadId, countUnread } from '../../lib/chatReadState.js';

export default function SporcleResult() {
  const [chatOpen, setChatOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const { code } = useParams();
  const navigate = useNavigate();
  const normalizedCode = (code ?? '').toUpperCase();

  const { identity } = useHostSporcleIdentity(normalizedCode);
  const myId = identity?.playerId ?? null;

  // playerId makes every poll double as a heartbeat on the server.
  const { state, loading, error, refresh } = useHostSporcle(normalizedCode, { playerId: myId });
  const actions = useHostSporcleActions(normalizedCode, { onVersion: () => refresh() });
  const profilesById = useRoomProfiles(state?.players ?? []);

  const lastReadId = getLastReadId(normalizedCode);
  const unreadChatCount = countUnread(state?.messages ?? [], myId, lastReadId);

  // Redirect to Play if phase is no longer 'finished'
  useEffect(() => {
    if (!state) return;
    if (state.phase !== 'finished') {
      navigate(`/sporcle/play/${normalizedCode}`, { replace: true });
    }
  }, [state?.phase, state?.version, navigate, normalizedCode]);

  /* ── Presence: instant leave beacon + ping + auto-rejoin ── */
  const meLeft = !!state?.players?.find((p) => p.id === myId)?.left;
  const { markIntentionalLeave } = useSporclePresence(normalizedCode, myId, {
    meLeft,
    beaconEnabled: true,
    onRejoined: refresh,
  });

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

  const profileByPlayerId = new Map();
  for (const p of players) {
    if (p.profileId && profilesById.has(p.profileId)) {
      profileByPlayerId.set(p.id, profilesById.get(p.profileId));
    }
  }

  const winnerProfile = winner ? profileByPlayerId.get(winner.playerId) ?? null : null;

  function handleSendChat(text) {
    return actions.chat(myId, text);
  }

  function handleBackToSetup() {
    // Explicit leave: user clicked "Back to setup"
    if (myId) {
      markIntentionalLeave();
      actions.leave(myId).catch(() => {});
    }
    navigate('/setup');
  }

  return (
    <>
      <div className="max-w-lg mx-auto pb-24 px-1 min-h-screen">
        <div className="space-y-8">
          <BorderContainer border="all" className="p-8 sm:p-10 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Final result
              </span>
              <ChatButton
                unreadCount={unreadChatCount}
                onClick={() => setChatOpen(true)}
              />
            </div>

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

          <BorderContainer border="all" className="p-4 sm:p-6 space-y-3">
            <h2 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Final standings
            </h2>
            <ul className="space-y-2">
              {standings.map((s, i) => {
                const isWinner = s.playerId === winnerId;
                const isMe = s.playerId === myId;
                const profile = profileByPlayerId.get(s.playerId) ?? null;

                const livePlayer = players.find((p) => p.id === s.playerId);
                const hasLeft = livePlayer?.left;
                const isHostPlayer = livePlayer?.isHost;

                return (
                  <li
                    key={s.playerId}
                    className={[
                      'flex items-center gap-3 rounded-md border px-4 py-3 transition-opacity',
                      hasLeft
                        ? 'opacity-50 border-border bg-surface-2'
                        : isWinner
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

                    <span
                      className={[
                        'flex-1 truncate font-medium flex items-center gap-1.5',
                        hasLeft ? 'text-ink-subtle line-through' : 'text-ink',
                      ].join(' ')}
                      dir="auto"
                    >
                      {s.name}
                      {isHostPlayer && (
                        <span title="Host" className="text-sm not-italic no-underline opacity-80">👑</span>
                      )}

                      {isMe && !hasLeft && (
                        <span className="ml-1 text-[10px] uppercase tracking-wider text-accent no-underline">
                          you
                        </span>
                      )}
                      {hasLeft && (
                        <span className="ml-1 text-[10px] uppercase tracking-wider text-ink-subtle no-underline">
                          left
                        </span>
                      )}
                    </span>
                    <span
                      className={[
                        'font-semibold tabular-nums',
                        hasLeft ? 'text-ink-subtle' : isWinner ? 'text-correct' : 'text-ink',
                      ].join(' ')}
                    >
                      {s.score}
                    </span>

                    {!isMe && !hasLeft && s.profileId && (
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

          {!isHost && (
            <p className="text-center text-xs text-ink-subtle">
              Waiting for the host to start another round…
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleBackToSetup}
              className="text-xs text-ink-subtle hover:text-ink transition-colors"
            >
              ← Back to setup
            </button>

            {isHost && (
              <Button variant="primary" onClick={() => setReplayOpen(true)}>
                Play again →
              </Button>
            )}
          </div>
        </div>
      </div>

      <ChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={state.messages ?? []}
        myId={myId}
        onSend={handleSendChat}
        players={state.players ?? []}
        roomCode={normalizedCode}
      />

      <ReplaySettingsModal
        open={replayOpen}
        onClose={() => setReplayOpen(false)}
        initialMode={state.mode}
        initialCount={state.roomConfig?.count ?? state.totalQuestions}
        initialConfig={state.roomConfig || {}}
        onSubmit={async (config) => {
          await actions.startAgain(myId, config);
        }}
      />
    </>
  );
}