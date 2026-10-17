// game/src/components/domain/Follow/InvitesTab.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { Button } from '../../ui/Button.jsx';
import {
  usePendingInvites,
  useDismissInvite,
} from '../../../hooks/invites/useInvites.js';
import { useToast } from '../../../hooks/ui/useToast';
import { SkeletonRowList } from '../../ui/SkeletonRow.jsx';

export function InvitesTab() {
  const navigate = useNavigate();
  const { data, isLoading, error } = usePendingInvites();
  const dismiss = useDismissInvite();
  const { show } = useToast();

  const [hidden, setHidden] = useState(() => new Set());

  if (isLoading) {
    return <SkeletonRowList count={3} />;
  }

  if (error) {
    return <p className="text-sm text-wrong py-8 text-center">{error.message}</p>;
  }

  const allInvites = data?.invites ?? [];
  const invites = allInvites.filter((inv) => !hidden.has(inv.id));

  if (allInvites.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center border border-dashed border-border rounded-md">
        No pending invitations.
      </p>
    );
  }

  function handleJoin(inv) {
    navigate(`/sporcle/play/${inv.roomCode}`);
  }

  function handleDismiss(inv) {
    setHidden((prev) => new Set(prev).add(inv.id));

    show({
      message: 'Invitation removed',
      actionLabel: 'Undo',
      durationMs: 30_000,
      onAction: () => {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(inv.id);
          return next;
        });
      },
      onDismiss: () => {
        dismiss.mutate(inv.id, {
          onSettled: () => {
            setHidden((prev) => {
              const next = new Set(prev);
              next.delete(inv.id);
              return next;
            });
          },
        });
      },
    });
  }

  return (
    <ul className="space-y-2">
      {invites.map((inv) => (
        <li
          key={inv.id}
          className="flex items-center gap-3 rounded-md border border-accent bg-accent-soft px-4 py-3"
        >
          <PlayerAvatar avatar={inv.inviter} size={36} ring="ring-border" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm text-ink font-medium truncate" dir="auto">
              {inv.inviter.nickname}
            </span>
            <span className="block text-xs text-ink-muted">
              invited you to room{' '}
              <span className="font-mono text-ink">{inv.roomCode}</span>
            </span>
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleJoin(inv)}
            aria-label={`Join room ${inv.roomCode}`}
            title={`Join room ${inv.roomCode}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 8 L11 8 M8 4 L12 8 L8 12 M3 3 L3 13"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">Join</span>
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(inv)}
            aria-label="Dismiss invite"
            title="Dismiss"
          >
            ✕
          </Button>
        </li>
      ))}

      {invites.length === 0 && allInvites.length > 0 && (
        <p className="text-sm text-ink-subtle py-6 text-center border border-dashed border-border rounded-md">
          All invitations removed.
        </p>
      )}
    </ul>
  );
}