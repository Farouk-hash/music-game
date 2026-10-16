// game/src/components/domain/Setup/Modals/SporcleModal.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../Modal/Modal.jsx';
import { Button } from '../../../ui/Button.jsx';
import { SharedGameSettings } from './SharedGameSettings.jsx';
import { useGameSettings } from '../../../../context/GameSettingsContext.jsx';
import { sporcleApi } from '../../../../lib/sporcleApi.js';
import { RoomPanel } from '../../Sporcle/RoomPanel.jsx';
import { useProfileContext } from '../../../../context/ProfileContext.jsx';

/**
 * The Sporcle modal — entry + lobby, all in one.
 *
 * Panels:
 *   'host'  — configure + create
 *   'join'  — code + name
 *   'room'  — lobby, then loading/countdown inline
 *
 * Flow:
 *   - Opened from Setup.jsx → shows 'host' or 'join' tabs.
 *   - After Create or Join succeeds, navigates to /sporcle/play/<code>.
 *   - The Play route re-mounts this same modal at the 'room' panel,
 *     passing its own state/actions/myId — so the modal doesn't poll.
 *
 * State hoisting:
 *   When rendered from Play.jsx, the parent owns the polling loop and
 *   passes `state`, `actions`, and `myId` down. When rendered from
 *   Setup.jsx, those are null and only host/join panels are shown.
 *
 * Closing semantics:
 *   - host / join panels → just close
 *   - room panel → leave the room, then close
 */
export function SporcleModal({
   open,
  onClose,
  initialMode = 'host',
  code: initialCode = null,
  scope = { genres: [], artists: [], years: [] },
  canHost = false,
  disabledTypes = new Set(),
  reversedClipsCount = 0,
  state = null,
  actions = null,
  myId = null,
  profilesById = new Map(),
  onIdentitySet = null, 
}) {
  const navigate = useNavigate();
  const settings = useGameSettings();

  const [panel, setPanel] = useState(initialMode);
  const [code, setCode] = useState(initialCode);

  // Host inputs
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState('speed');
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(5);

  // Join inputs
  const [joinCode, setJoinCode] = useState(initialCode ?? '');


  const { profile } = useProfileContext();

  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');

  useEffect(() => {
    if (!profile?.nickname) return;
    setHostName((prev) => prev || profile.nickname);
    setJoinName((prev) => prev || profile.nickname);
  }, [profile?.nickname]);

  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState(null);

  // Reset local state when the modal reopens.
  useEffect(() => {
    if (!open) return;
    setPanel(initialMode);
    setCode(initialCode);
    setJoinCode(initialCode ?? '');
    setError(null);
    setSubmitting(null);
  }, [open, initialMode, initialCode]);

  /* ── Handlers ─────────────────────────────────────────── */

  const hostReady = canHost && hostName.trim().length > 0 && !submitting;

  const joinReady =
    joinCode.trim().length === 6 &&
    joinName.trim().length > 0 &&
    !submitting;

  async function handleCreate() {
    if (!hostReady) return;
    setSubmitting('host');
    setError(null);

    const config = { level };

    if (scope.genres?.length)  config.genres  = scope.genres;
    if (scope.artists?.length) config.artists = scope.artists;
    if (scope.years?.length)   config.years   = scope.years;

    const types = settings.questionTypes ?? [];
    if (types.length > 0 && types.length < 8) config.types = types;

    if (settings.instruments && settings.instruments !== 'none') {
      config.instruments = settings.instruments;
    }
    if (settings.reversedAnswers && settings.reversedAnswers !== 'no') {
      config.reversed = settings.reversedAnswers;
    }
    if (settings.audioRendition === 'reverse') {
      config.rendition = 'reverse';
    }
    config.count = settings.roundCount ?? 10;

    try {
      const r = await sporcleApi.create({
        hostName: hostName.trim(),
        mode,
        config,
        autoAdvanceSeconds,
        profileId: profile?.id ?? null,
      });

      if (onIdentitySet) {
        onIdentitySet(r.code, r.hostId, hostName.trim());
      } else {
        // Fallback for when the modal is rendered without the setter.
        localStorage.setItem(`sporcle:${r.code}:playerId`, r.hostId);
        localStorage.setItem(`sporcle:${r.code}:name`, hostName.trim());
      }

      // Hand off to the Play route. It owns the polling loop and
      // re-opens this modal at the 'room' panel with live state.
      navigate(`/sporcle/play/${r.code}`);
    } catch (e) {
      setError(e);
      setSubmitting(null);
    }
  }

  async function handleJoin() {
    if (!joinReady) return;
    setSubmitting('join');
    setError(null);

    const c = joinCode.trim().toUpperCase();

    try {
      const r = await sporcleApi.join(c, { name: joinName.trim()  ,profileId: profile?.id ?? null,});
  
      if (onIdentitySet) {
        onIdentitySet(c, r.playerId, joinName.trim());
      } else {
        localStorage.setItem(`sporcle:${c}:playerId`, r.playerId);
        localStorage.setItem(`sporcle:${c}:name`, joinName.trim());
      }

      navigate(`/sporcle/play/${c}`);
    } catch (e) {
      setError(e);
      setSubmitting(null);
    }
  }

  async function handleClose() {
    if (panel === 'room' && code) {
      const identityStr = localStorage.getItem(`sporcle:${code}:playerId`);
      if (identityStr) {
        try {
          await sporcleApi.action(code, { playerId: identityStr, type: 'leave' });
        } catch {}
      }
      localStorage.removeItem(`sporcle:${code}:playerId`);
      localStorage.removeItem(`sporcle:${code}:name`);
    }
    onClose?.();
  }

  /* ── Render ───────────────────────────────────────────── */

  const showTabs = panel === 'host' || panel === 'join';

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Sporcle
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">
              {panel === 'host' && 'Play live with friends'}
              {panel === 'join' && 'Join a game'}
              {panel === 'room' && 'Lobby'}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              {panel === 'host' && 'One host picks the scope. Everyone else joins with a code. Race to answer or collect points — your call.'}
              {panel === 'join' && 'Enter the code the host shared with you.'}
              {panel === 'room' && 'Waiting for players. Start when everyone is ready.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-ink-subtle hover:text-ink text-sm shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {showTabs && (
          <div className="flex gap-2">
            <TabButton active={panel === 'host'} onClick={() => setPanel('host')}>
              Host a game
            </TabButton>
            <TabButton active={panel === 'join'} onClick={() => setPanel('join')}>
              Join a game
            </TabButton>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-wrong bg-wrong-soft p-3">
            <p className="text-sm text-wrong">{error.message}</p>
          </div>
        )}

        {panel === 'host' && (
          <>
            {!canHost && (
              <div className="rounded-md border border-wrong bg-wrong-soft p-3">
                <p className="text-sm text-wrong">
                  Pick a genre (and optionally artists and years) first.
                  The scope is what the questions come from.
                </p>
              </div>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Your name
              </h3>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Ali"
                maxLength={20}
                className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              />
            </section>

            <SharedGameSettings
              variant="sporcle"
              disabledTypes={disabledTypes}
              reversedClipsCount={reversedClipsCount}
              allowInstruments={true}
              level={level}
              setLevel={setLevel}
              mode={mode}
              setMode={setMode}
              autoAdvanceSeconds={autoAdvanceSeconds}
              setAutoAdvanceSeconds={setAutoAdvanceSeconds}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!hostReady}
              >
                {submitting === 'host' ? 'Creating…' : 'Create room →'}
              </Button>
            </div>
          </>
        )}

        {panel === 'join' && (
          <>
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Room code
              </h3>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                autoCapitalize="characters"
                className="w-full h-12 rounded-md border border-border bg-surface-2 px-4 text-center text-2xl font-mono tracking-[0.3em] text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Your name
              </h3>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="e.g. Sara"
                maxLength={20}
                className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              />
            </section>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleJoin}
                disabled={!joinReady}
              >
                {submitting === 'join' ? 'Joining…' : 'Join room →'}
              </Button>
            </div>
          </>
        )}

        {panel === 'room' && code && (
          <RoomPanel
            code={code}
            onClose={handleClose}
            state={state}
            actions={actions}
            myId={myId}
            profilesById={profilesById}
          />
        )}
      </div>
    </Modal>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'px-4 h-10 rounded-md border text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-bg border-accent'
          : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
