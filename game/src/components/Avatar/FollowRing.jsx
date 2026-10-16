// game/src/components/Avatar/FollowRing.jsx
import { PlayerAvatar } from './PlayerAvatar.jsx';
import { useFollowStatus } from '../../hooks/follows/useFollows.js';

/**
 * Wraps PlayerAvatar and overlays a follow indicator.
 *
 *   friends  → 2px green ring around the avatar
 *   incoming → 2px accent ring + small accent dot (action needed)
 *   others   → plain avatar
 *
 * `ring` — optional override for the avatar's own ring color class
 *          (e.g. 'ring-correct' for the winner, 'ring-accent' for
 *          "me"). When provided, the follow ring is NOT applied —
 *          the caller's ring wins, to avoid double rings.
 */
export function FollowRing({
  profileId,
  avatar,
  seed,
  size = 32,
  ring,
  alt = '',
}) {
  const { status } = useFollowStatus(profileId);

  const isFriend   = status === 'friends' || status === 'following';
  const isIncoming = status === 'incoming';

  const showFollowRing = !ring && (isFriend || isIncoming);

  const innerRing = ring ?? 'ring-border';

  // Friends → green ring. Incoming → accent ring (a "you have an
  // action" signal, not a "confirmed" one).
  const wrapperClass = !showFollowRing
    ? 'relative inline-flex shrink-0'
    : isFriend
      ? 'relative inline-flex shrink-0 rounded-full p-0.5 ring-2 ring-correct'
      : 'relative inline-flex shrink-0 rounded-full p-0.5 ring-2 ring-accent';

  return (
    <span className={wrapperClass}>
      <PlayerAvatar
        seed={seed}
        avatar={avatar}
        size={size}
        ring={innerRing}
        alt={alt}
      />
      {isIncoming && !ring && (
        <span
          aria-label="Incoming friend request"
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent border-2 border-bg"
        />
      )}
    </span>
  );
}