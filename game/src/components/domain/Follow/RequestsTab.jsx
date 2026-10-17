// game/src/components/domain/Follow/RequestsTab.jsx
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { Button } from '../../ui/Button.jsx';
import {
  usePending,
  useAcceptRequest,
  useDeclineRequest,
  useUnfollow,
} from '../../../hooks/follows/useFollows.js';
import { SkeletonRowList } from '../../ui/SkeletonRow.jsx';

export function RequestsTab() {
  const { data, isLoading, error } = usePending();
  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  const unfollow = useUnfollow();

  if (isLoading) {
    return <SkeletonRowList count={3} />;
  }

  if (error) {
    return <p className="text-sm text-wrong py-8 text-center">{error.message}</p>;
  }

  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <p className="text-sm text-ink-subtle py-8 text-center border border-dashed border-border rounded-md">
        No pending requests.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Incoming ({incoming.length})
          </h3>
          <ul className="space-y-2">
            {incoming.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-accent bg-accent-soft px-4 py-3"
              >
                <PlayerAvatar avatar={p} size={36} ring="ring-border" />
                <span className="flex-1 truncate text-ink font-medium" dir="auto">
                  {p.nickname}
                </span>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => accept.mutate(p.id)}
                  disabled={accept.isPending}
                  aria-label="Accept request"
                  title="Accept request"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8.5 L6.5 12 L13 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">Accept</span>
                  </span>
                </Button>

                <Button
                  variant="danger-outline"
                  size="sm"
                  onClick={() => decline.mutate(p.id)}
                  disabled={decline.isPending}
                  aria-label="Decline request"
                  title="Decline request"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4 L12 12 M12 4 L4 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">Decline</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Sent ({outgoing.length})
          </h3>
          <ul className="space-y-2">
            {outgoing.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3"
              >
                <PlayerAvatar avatar={p} size={36} ring="ring-border" />
                <span className="flex-1 truncate text-ink-muted font-medium" dir="auto">
                  {p.nickname}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-ink-subtle shrink-0 hidden sm:inline">
                  pending
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unfollow.mutate(p.id)}
                  disabled={unfollow.isPending}
                  aria-label="Cancel request"
                  title="Cancel request"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4 L12 12 M12 4 L4 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">Cancel</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}