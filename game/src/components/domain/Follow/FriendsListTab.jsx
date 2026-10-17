// game/src/components/domain/Follow/FriendsListTab.jsx
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { Button } from '../../ui/Button.jsx';
import { useFriends, useUnfollow } from '../../../hooks/follows/useFollows.js';
import { SkeletonRowList } from '../../ui/SkeletonRow.jsx';

export function FriendsListTab() {
  const { data, isLoading, error } = useFriends();
  const unfollow = useUnfollow();

  const friends = data?.friends ?? [];

  if (isLoading) {
    return <SkeletonRowList count={3} />;
  }

  if (error) {
    return (
      <p className="text-sm text-wrong py-8 text-center">{error.message}</p>
    );
  }

  if (friends.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center border border-dashed border-border rounded-md">
        No friends yet. Follow someone in a Sporcle lobby to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {friends.map((f) => (
        <li
          key={f.id}
          className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3"
        >
          <PlayerAvatar avatar={f} size={36} ring="ring-border" />
          <span className="flex-1 truncate text-ink font-medium" dir="auto">
            {f.nickname}
          </span>
          <Button
            variant="danger-outline"
            size="sm"
            onClick={() => unfollow.mutate(f.id)}
            disabled={unfollow.isPending}
            aria-label="Unfollow"
            title="Unfollow"
          >
            <span className="inline-flex items-center gap-1.5">
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.75" />
                <path d="M2 14c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M11 6 L15 10 M15 6 L11 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Unfollow</span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}