// game/src/components/domain/Sporcle/ChatModal.jsx
import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { Button } from '../../ui/Button.jsx';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { useRoomProfiles } from '../../../hooks/sporcle/useRoomProfiles.js';
import { getLastReadId, setLastReadId } from '../../../lib/chatReadState.js';

export function ChatModal({ open, onClose, messages = [], myId, onSend, players = [], roomCode }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const profilesById = useRoomProfiles(players);

  // When the modal opens, mark everything as read.
  useEffect(() => {
    if (!open) return;
    const latest = messages.length > 0 ? messages[messages.length - 1].id : 0;
    if (latest > 0 && roomCode) setLastReadId(roomCode, latest);
  }, [open, messages, roomCode]);

  // Auto-scroll to bottom on open and on new messages.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) setDraft('');
  }, [open]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft('');
    } catch {
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Room Chat
            </p>
            <h2 className="text-lg font-bold text-ink mt-1">
              {messages.length === 0 ? 'No messages yet' : `${messages.length} messages`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-subtle hover:text-ink text-sm"
          >
            ✕
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[200px]"
        >
          {messages.length === 0 && (
            <p className="text-sm text-ink-subtle text-center py-8">
              Be the first to send a message.
            </p>
          )}

          {messages.map((m) => {
            const isMine = m.playerId === myId;
            const profile = m.profileId ? profilesById.get(m.profileId) ?? null : null;
            return (
              <div
                key={m.id}
                className={[
                  'flex items-end gap-2',
                  isMine ? 'flex-row-reverse' : 'flex-row',
                ].join(' ')}
              >
                {!isMine && (
                  <PlayerAvatar
                    avatar={profile}
                    seed={m.authorName}
                    size={28}
                    ring="ring-border"
                  />
                )}
                <div
                  className={[
                    'max-w-[75%] rounded-lg px-3 py-2 space-y-1',
                    isMine
                      ? 'bg-accent text-bg'
                      : 'bg-surface-2 text-ink border border-border',
                  ].join(' ')}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                      {m.authorName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words" dir="auto">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border px-6 py-4 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 200))}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Say something…"
              disabled={sending}
              className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none resize-none disabled:opacity-50"
              dir="auto"
            />
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
            >
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
          <p className="text-[10px] text-ink-subtle mt-1 text-right">
            {draft.length}/200
          </p>
        </div>
      </div>
    </Modal>
  );
}