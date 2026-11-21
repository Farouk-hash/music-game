// game/src/components/domain/Follow/FriendsEntry.jsx
import { usePending } from '../../../hooks/follows/useFollows.js';
import { usePendingInvites } from '../../../hooks/invites/useInvites.js';
import { IconFriends } from '../../../icons/index.js';

export function FriendsEntry({ onClick }) {
  const { data } = usePending();
  const hasIncoming = (data?.incoming?.length ?? 0) > 0;

  const { data: inv } = usePendingInvites({ enabled: false });
  const hasInvites = (inv?.invites?.length ?? 0) > 0;
  const showDot = hasIncoming || hasInvites;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Friends"
      className={[
        'relative inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-surface-2',
        'text-ink-muted hover:border-accent-2 hover:text-ink transition-colors',
      ].join(' ')}
    >
      <IconFriends />
      <span className="hidden sm:inline text-sm">Friends</span>

      {showDot && (
        <span
          aria-label="Pending friend requests"
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border border-bg"
        />
      )}
    </button>
  );
}