// game/src/components/domain/Follow/FollowButton.jsx
import { useState, useEffect } from 'react';
import {
  useFollowStatus,
  useSendRequest,
  useAcceptRequest,
  useUnfollow,
} from '../../../hooks/follows/useFollows.js';
import { IconCheck, IconClose, IconUserMinus, IconUserPlus } from '../../../icons/index.js';

/**
 * State-aware follow button.
 *
 * At `sm:` and up: text labels ("Follow", "Requested", "Accept", "✓ Friends").
 * Below `sm`:     icon-only.
 *
 * Optimistic: status flips immediately, rolls back on error.
 */
export function FollowButton({ profileId, size = 'sm', friendsOnly = 'show' }) {
  const { status: serverStatus, isLoading } = useFollowStatus(profileId);

  const send = useSendRequest();
  const accept = useAcceptRequest();
  const unfollow = useUnfollow();

  const [optimistic, setOptimistic] = useState(null);

  useEffect(() => { setOptimistic(null); }, [profileId]);

  useEffect(() => {
    if (optimistic && serverStatus === optimistic) setOptimistic(null);
  }, [optimistic, serverStatus]);

  const status = optimistic ?? serverStatus;

  if (status === 'self' || !profileId) return null;
  if (isLoading && !optimistic) return null;

  const pending =
    send.isPending || accept.isPending || unfollow.isPending;

  const sizeClass =
    size === 'sm'
      ? 'h-7 px-2.5 text-xs'
      : 'h-9 px-3 text-sm';

  const iconClass = 'w-3.5 h-3.5 shrink-0';

  async function handleFollow() {
    setOptimistic('requested');
    try { await send.mutateAsync(profileId); }
    catch { setOptimistic(null); }
  }

  async function handleAccept() {
    setOptimistic('friends');
    try { await accept.mutateAsync(profileId); }
    catch { setOptimistic(null); }
  }

  async function handleUnfollow() {
    setOptimistic('none');
    try { await unfollow.mutateAsync(profileId); }
    catch { setOptimistic(null); }
  }

  if (status === 'none') {
    return (
      <button
        type="button"
        onClick={handleFollow}
        disabled={pending}
        aria-label="Follow"
        title="Follow"
        className={[
          'rounded-md border font-medium shrink-0 transition-colors',
          'bg-accent text-bg border-accent hover:bg-accent-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'inline-flex items-center gap-1.5 justify-center',
          sizeClass,
        ].join(' ')}
      >
        <IconUserPlus className={iconClass} />
        <span className="hidden sm:inline">Follow</span>
      </button>
    );
  }

  if (status === 'requested') {
    return (
      <span className="inline-flex items-center gap-1 shrink-0">
        <span
          className={[
            'rounded-md border font-medium',
            'bg-surface-2 text-ink-muted border-border',
            sizeClass,
            'hidden sm:inline-flex items-center px-2.5',
          ].join(' ')}
        >
          Requested
        </span>
        <button
          type="button"
          onClick={handleUnfollow}
          disabled={pending}
          title="Cancel request"
          aria-label="Cancel follow request"
          className={[
            'rounded-md border border-border bg-surface-2 text-ink-subtle',
            'hover:border-wrong hover:text-wrong transition-colors',
            'inline-flex items-center justify-center shrink-0',
            'w-7 h-7',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <IconClose className="w-3 h-3" />
        </button>
      </span>
    );
  }

  if (status === 'incoming') {
    return (
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        aria-label="Accept follow request"
        title="Accept follow request"
        className={[
          'rounded-md border font-medium shrink-0 transition-colors',
          'bg-accent text-bg border-accent hover:bg-accent-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'inline-flex items-center gap-1.5 justify-center',
          sizeClass,
        ].join(' ')}
      >
        <IconCheck className={iconClass} />
        <span className="hidden sm:inline">Accept</span>
      </button>
    );
  }

  if (status === 'friends' || status === 'following') {
    if (friendsOnly === 'hidden') return null;
    return (
      <span className="inline-flex items-center gap-1 shrink-0">
        <span
          className={[
            'rounded-md border font-medium',
            'bg-surface-2 text-correct border-correct',
            sizeClass,
            'inline-flex items-center gap-1.5 px-2.5',
          ].join(' ')}
        >
          <IconCheck className={iconClass} />
          <span className="hidden sm:inline">
            {status === 'friends' ? 'Friends' : 'Following'}
          </span>
        </span>
        <button
          type="button"
          onClick={handleUnfollow}
          disabled={pending}
          title="Unfollow"
          aria-label="Unfollow"
          className={[
            'rounded-md border border-border bg-surface-2 text-ink-subtle',
            'hover:border-wrong hover:text-wrong transition-colors',
            'inline-flex items-center justify-center shrink-0',
            'w-7 h-7',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <IconUserMinus className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return null;
}