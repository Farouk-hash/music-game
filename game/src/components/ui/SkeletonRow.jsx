// game/src/components/ui/SkeletonRow.jsx
import { Skeleton } from './Skeleton.jsx';

/**
 * A single shimmering placeholder row that mimics a player list row.
 *
 * Rendered as a stack of 3 while a list is loading — it gives the eye
 * something to land on that matches the shape of the content that's
 * about to arrive.
 *
 * Matches the layout of FriendsListTab / RequestsTab / InvitesTab rows:
 *   [ avatar ] [ two text lines ] [ action pill ]
 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0" rounded="full" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="h-7 w-16 shrink-0" rounded="sm" />
    </div>
  );
}

/**
 * Convenience wrapper — a stack of N rows with the list gap.
 *
 *   <SkeletonRowList count={3} />
 */
export function SkeletonRowList({ count = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}