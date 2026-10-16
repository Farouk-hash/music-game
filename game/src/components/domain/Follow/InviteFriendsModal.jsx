// game/src/components/domain/Follow/InviteFriendsModal.jsx
import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { Button } from '../../ui/Button.jsx';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { useFriends } from '../../../hooks/follows/useFollows.js';
import { useSendInvites, useRoomInvites } from '../../../hooks/invites/useInvites.js';

/**
 * Host-only modal: pick friends to invite to the current room.
 *
 * Pre-checks already-invited friends (fetched from the server).
 * Un-checking a pre-checked friend triggers a revoke on submit.
 */
export function InviteFriendsModal({ open, onClose, roomCode }) {
  const { data: friendsData, isLoading: friendsLoading } = useFriends();
  const { data: roomData, isLoading: roomLoading } = useRoomInvites(roomCode, { enabled: open });
  const send = useSendInvites();

  // Current selection (checked state).
  const [selected, setSelected] = useState(() => new Set());

  // The set we started with — used to compute revokes on submit.
  const initialRef = useRef(new Set());

  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  // Reset when closing; pre-check when data arrives while open.
  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      initialRef.current = new Set();
      setError(null);
      setSent(false);
      return;
    }
    if (roomData?.invitedIds) {
      const initial = new Set(roomData.invitedIds);
      setSelected(new Set(initial));
      initialRef.current = initial;
      setError(null);
      setSent(false);
    }
  }, [open, roomData?.invitedIds]);

  const friends = friendsData?.friends ?? [];
  const loading = friendsLoading || roomLoading;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    const invited = Array.from(selected);
    const revoked = Array.from(initialRef.current).filter((id) => !selected.has(id));

    if (invited.length === 0 && revoked.length === 0) {
      onClose?.();
      return;
    }

    setError(null);
    try {
      await send.mutateAsync({ roomCode, friendIds: invited, revokedIds: revoked });
      setSent(true);
      setTimeout(() => { onClose?.(); }, 600);
    } catch (e) {
      setError(e);
    }
  }

  const dirty =
    selected.size !== initialRef.current.size ||
    Array.from(selected).some((id) => !initialRef.current.has(id));

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Invite
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">
              Invite friends to room {roomCode}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Already-invited friends are pre-selected. Uncheck to revoke.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {loading && (
          <p className="text-sm text-ink-muted py-8 text-center">Loading…</p>
        )}

        {!loading && friends.length === 0 && (
          <p className="text-sm text-ink-subtle py-8 text-center border border-dashed border-border rounded-md">
            You don't have any friends yet. Follow someone in a Sporcle lobby first.
          </p>
        )}

        {!loading && friends.length > 0 && (
          <ul className="space-y-2">
            {friends.map((f) => {
              const checked = selected.has(f.id);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => toggle(f.id)}
                    aria-pressed={checked}
                    className={[
                      'w-full flex items-center gap-3 rounded-md border px-4 py-3',
                      'transition-colors text-left',
                      checked
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-surface-2 hover:border-accent-2',
                    ].join(' ')}
                  >
                    <PlayerAvatar avatar={f} size={36} ring="ring-border" />
                    <span className="flex-1 truncate text-ink font-medium" dir="auto">
                      {f.nickname}
                    </span>
                    <span
                      aria-hidden="true"
                      className={[
                        'flex h-6 w-6 items-center justify-center rounded-md border shrink-0',
                        checked
                          ? 'bg-accent text-bg border-accent'
                          : 'bg-surface border-border',
                      ].join(' ')}
                    >
                      {checked && (
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
                          <path
                            d="M3 8.5 L6.5 12 L13 4.5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <div className="rounded-md border border-wrong bg-wrong-soft p-3">
            <p className="text-sm text-wrong">{error.message}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!dirty || send.isPending || sent}
          >
            {sent
              ? '✓ Saved'
              : send.isPending
              ? 'Saving…'
              : `Save${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}