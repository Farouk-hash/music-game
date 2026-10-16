// game/src/components/domain/Follow/FollowBadge.jsx
import { useFollowStatus } from '../../../hooks/follows/useFollows.js';

/**
 * Read-only follow status chip.
 *
 * Renders only when the relationship is one of:
 *   friends   → "Friends" (accent chip)
 *   incoming  → "Requested you" (accent-soft chip)
 *   requested → "Requested" (muted chip)
 *
 * Returns null in every other state — no chip means no visual noise
 * for players you have no relationship with.
 */
export function FollowBadge({ profileId, size = 'sm' }) {
  const { status } = useFollowStatus(profileId);

  if (!profileId) return null;
  if (status === 'self' || status === 'none' || status === 'loading') return null;
  if (status === 'following') return null;

  const sizeClass =
    size === 'sm'
      ? 'h-5 px-1.5 text-[9px]'
      : 'h-6 px-2 text-[10px]';

  if (status === 'friends') {
    return (
      <span
        className={[
          'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider shrink-0',
          'bg-accent text-bg border-accent',
          sizeClass,
        ].join(' ')}
        title="You are friends"
      >
        Friends
      </span>
    );
  }

  if (status === 'incoming') {
    return (
      <span
        className={[
          'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider shrink-0',
          'bg-accent-soft text-accent border-accent',
          sizeClass,
        ].join(' ')}
        title="They sent you a friend request"
      >
        Requested you
      </span>
    );
  }

  if (status === 'requested') {
    return (
      <span
        className={[
          'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider shrink-0',
          'bg-surface text-ink-subtle border-border',
          sizeClass,
        ].join(' ')}
        title="Friend request pending"
      >
        Requested
      </span>
    );
  }

  return null;
}