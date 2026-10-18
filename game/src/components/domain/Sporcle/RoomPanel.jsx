// game/src/components/domain/Sporcle/RoomPanel.jsx
import { useEffect, useState } from 'react';
import { BorderContainer } from '../../layout/BorderContainer.jsx';
import { Button } from '../../ui/Button.jsx';
import { PlayerRoster } from './PlayerRoster.jsx';
import { LoadingOverlay } from './LoadingOverlay.jsx';
import { CountdownOverlay } from './CountdownOverlay.jsx';
import { ChatButton } from './ChatButton.jsx';
import { ChatModal } from './ChatModal.jsx';
import { AutoCloseBar } from './AutoCloseBar.jsx';
import { InviteFriendsModal } from '../Follow/InviteFriendsModal.jsx';
import { getLastReadId, countUnread } from '../../../lib/chatReadState.js';

const ALONE_TIMEOUT_MS     = 60_000;
const NO_READY_TIMEOUT_MS  = 60_000;
const HOST_IDLE_TIMEOUT_MS = 60_000;

export function RoomPanel({ code, onClose, state, actions, myId, profilesById = new Map() }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(null);

  const me = state?.players?.find((p) => p.id === myId) ?? null;
  const isHost = !!me?.isHost;
  const lastReadId = getLastReadId(code);
  const unreadChatCount = countUnread(state?.messages ?? [], myId, lastReadId);

  const activePlayers = state?.players?.filter((p) => !p.left) ?? [];
  const nonHostActive = activePlayers.filter((p) => !p.isHost);
  const allReady      = nonHostActive.length > 0 && nonHostActive.every((p) => p.ready);
  const canStart      = isHost && activePlayers.length >= 2 && allReady;
  const inLobby       = state?.phase === 'lobby';
  const inLoading     = state?.phase === 'loading';
  const inCountdown   = state?.phase === 'countdown';

  // Server-driven wait window (visible to ALL players).
  const waitStartedAt = state?.lobbyWaitStartedAt ?? null;
  const waitReason    = state?.lobbyWaitReason    ?? null;
  const showWaitBar   = inLobby && waitStartedAt != null && waitReason != null;

  const waitDurationMs =
    waitReason === 'alone'     ? ALONE_TIMEOUT_MS :
    waitReason === 'no-ready'  ? NO_READY_TIMEOUT_MS :
    waitReason === 'host-idle' ? HOST_IDLE_TIMEOUT_MS :
    0;

  const waitLabel =
    waitReason === 'alone'     ? 'Waiting for players…' :
    waitReason === 'no-ready'  ? 'Waiting for everyone to ready up…' :
    waitReason === 'host-idle' ? 'Everyone is ready…' :
    '';

  const waitSublabel =
    waitReason === 'alone'     ? 'Room closes if nobody joins.' :
    waitReason === 'no-ready'  ? 'Room closes if nobody readies.' :
    waitReason === 'host-idle' ? "Room closes if the host doesn't start." :
    '';

  // Only the host triggers the destroy. Non-hosts rely on the 404 broadcast.
  async function handleWaitExpired() {
    if (!isHost) return;

    try {
      if (waitReason === 'alone') {
        if (myId && actions) await actions.leave(myId);
      } else if (waitReason === 'no-ready' || waitReason === 'host-idle') {
        if (myId && actions) await actions.forceClose(myId);
      }
    } catch {}

    onClose?.();
  }

  /* ── Countdown ticker ─────────────────────────────────── */
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!inCountdown) return;
    const id = setInterval(() => forceTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [inCountdown]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('code');
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function copyLink() {
    try {
      const url = `${window.location.origin}/sporcle/play/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied('link');
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function handleReady() {
    if (!me || !inLobby || !myId || !actions) return;
    try { await actions.ready(myId, !me.ready); } catch {}
  }

  async function handleStart() {
    if (!canStart || !inLobby || !myId || !actions) return;
    try { await actions.start(myId); } catch {}
  }

  async function handleSendChat(text) {
    if (!myId || !actions) return;
    return actions.chat(myId, text);
  }

  if (!state) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-ink-muted">Loading room…</p>
      </div>
    );
  }

  if (inLoading) return <LoadingOverlay inline />;

  if (inCountdown) {
    const stillCounting =
      typeof state.countdownEndsAt === 'number' &&
      state.countdownEndsAt > Date.now();

    if (stillCounting) {
      return (
        <CountdownOverlay inline endsAt={state.countdownEndsAt} totalMs={10000} />
      );
    }
    return (
      <div className="py-12 text-center space-y-3">
        <div className="flex justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-accent-2 border-t-accent animate-spin" />
        </div>
        <p className="text-sm text-ink-muted">Starting…</p>
      </div>
    );
  }

  return (
    <>
      <BorderContainer border="all" className="p-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Room code
          </p>
          <p className="text-4xl font-mono font-bold text-ink tracking-[0.4em]">
            {code}
          </p>

          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={copyCode}
              className="px-3 h-9 rounded-md border border-border bg-surface-2 text-xs text-ink-muted hover:border-accent-2 hover:text-ink transition-colors"
            >
              {copied === 'code' ? '✓ Copied' : 'Copy code'}
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="px-3 h-9 rounded-md border border-border bg-surface-2 text-xs text-ink-muted hover:border-accent-2 hover:text-ink transition-colors"
            >
              {copied === 'link' ? '✓ Copied' : 'Copy invite link'}
            </button>
            <ChatButton
              unreadCount={unreadChatCount}
              onClick={() => setChatOpen(true)}
            />
            {isHost && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="px-3 h-9 rounded-md border border-accent bg-accent text-bg text-xs font-medium hover:bg-accent-2 transition-colors"
              >
                Invite friends
              </button>
            )}
          </div>
        </div>
      </BorderContainer>

      {showWaitBar && (
        <AutoCloseBar
          startedAt={waitStartedAt}
          durationMs={waitDurationMs}
          onExpire={handleWaitExpired}
          label={waitLabel}
          sublabel={waitSublabel}
        />
      )}

      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          Players
        </h3>
        <PlayerRoster
          players={state.players}
          phase={state.phase}
          myId={myId}
          profilesById={profilesById}
        />
      </section>

      {state.lastError && (
        <div className="rounded-md border border-wrong bg-wrong-soft p-3">
          <p className="text-sm text-wrong">{state.lastError}</p>
        </div>
      )}
      {actions?.error && (
        <div className="rounded-md border border-wrong bg-wrong-soft p-3">
          <p className="text-sm text-wrong">{actions.error.message}</p>
        </div>
      )}

      <footer className="space-y-3 pt-2 border-t border-border">
        {isHost ? (
          <>
            <p className="text-sm text-ink-muted">
              {activePlayers.length < 2
                ? 'Waiting for at least one more player…'
                : allReady
                ? 'Everyone is ready. Start when you are.'
                : 'Waiting for all players to ready up.'}
            </p>
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={!canStart || actions?.pending === 'start'}
              className="w-full"
            >
              {actions?.pending === 'start' ? 'Starting…' : 'Start game'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              {me?.ready ? 'You are ready.' : 'Mark yourself ready when set.'}
            </p>
            <Button
              variant={me?.ready ? 'secondary' : 'primary'}
              onClick={handleReady}
              disabled={actions?.pending === 'ready'}
              className="w-full"
            >
              {actions?.pending === 'ready'
                ? 'Saving…'
                : me?.ready
                ? 'Not ready'
                : 'Ready'}
            </Button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="block mx-auto text-xs text-ink-subtle hover:text-ink"
        >
          Leave room
        </button>
      </footer>

      <InviteFriendsModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roomCode={code}
      />

      <ChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={state.messages ?? []}
        myId={myId}
        onSend={handleSendChat}
        players={state.players ?? []}
        roomCode={code}
      />
    </>
  );
}