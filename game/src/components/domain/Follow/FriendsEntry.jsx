// game/src/components/domain/Follow/FriendsEntry.jsx
import { usePending } from '../../../hooks/follows/useFollows.js';
import { usePendingInvites } from '../../../hooks/invites/useInvites.js';

export function FriendsEntry({ onClick }) {
  const { data } = usePending();
  const hasIncoming = (data?.incoming?.length ?? 0) > 0;

  const { data: inv } = usePendingInvites();
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
      <svg
        viewBox="0 0 20 20"
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="3" />
        <path d="M2 17c0-2.5 2.24-4.5 5-4.5S12 14.5 12 17" />
        <circle cx="15" cy="6" r="2.25" />
        <path d="M13 12.5c1.4-.5 2.6-.5 3.6 0 1.2.6 1.9 1.7 1.9 3" />
      </svg>
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