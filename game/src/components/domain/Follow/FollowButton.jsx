// game/src/components/domain/Follow/FollowButton.jsx
import { useState, useEffect } from 'react';
import {
  useFollowStatus,
  useSendRequest,
  useAcceptRequest,
  useUnfollow,
} from '../../../hooks/follows/useFollows.js';

/**
 * State-aware follow button.
 *
 * At `sm:` and up: text labels ("Follow", "Requested", "Accept", "✓ Friends").
 * Below `sm`:     icon-only (person-plus, ×, ✓, ✓ ×).
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

  /* ── Handlers ──────────────────────────────────────── */

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

  /* ── Icons ─────────────────────────────────────────── */

  const IconFollow = (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 6v4M10 8h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );

  const IconCheck = (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const IconX = (
    <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none" aria-hidden="true">
      <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  /* ── Renders ───────────────────────────────────────── */

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
        {IconFollow}
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
          {IconX}
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
        {IconCheck}
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
          {IconCheck}
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
          {IconX}
        </button>
      </span>
    );
  }

  return null;
}