// game/src/components/domain/Sporcle/SporcleProgress.jsx
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { SegmentedProgress } from '../../ui/SegmentedProgress.jsx';

export function SporcleProgress({
  players = [],
  totalQuestions = 0,
  qIndex = 0,
  phase = 'lobby',
  answersByQ = {},
  myId = null,
  avatarStyle,
}) {
  if (players.length === 0 || totalQuestions === 0) return null;

  const currentIsPublic = phase === 'reveal' || phase === 'finished';

  return (
    <div className="space-y-2">
      {players.map((p) => {
        const isMe = p.id === myId;
        const isLeft = !!p.left;

        const segments = Array.from({ length: totalQuestions }).map((_, q) => {
          const result = answersByQ?.[q]?.[p.id];

          if (q < qIndex) {
            if (!result) return { fill: 0, tier: 'neutral' };
            return { fill: 1, tier: result === 'correct' ? 'correct' : 'wrong' };
          }

          if (q === qIndex) {
            if (!result) return { fill: 0, tier: 'neutral' };
            if (!currentIsPublic) return { fill: 1, tier: 'neutral' };
            return { fill: 1, tier: result === 'correct' ? 'correct' : 'wrong' };
          }

          return { fill: 0, tier: 'neutral' };
        });

        return (
          <div
            key={p.id}
            className={[
              'rounded-md border px-3 py-2 space-y-1.5 transition-colors',
              isLeft
                ? 'border-border bg-surface-2 opacity-50'
                : isMe
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface-2',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-3">
              {/* Avatar */}
              <PlayerAvatar
                seed={p.name}
                style={avatarStyle}
                size={28}
                ring={isMe && !isLeft ? 'ring-accent' : 'ring-border'}
              />

              <span
                className={[
                  'text-sm truncate flex items-center gap-2 flex-1 min-w-0',
                  isLeft
                    ? 'text-ink-subtle line-through'
                    : isMe
                    ? 'text-ink font-semibold'
                    : 'text-ink-muted',
                ].join(' ')}
                dir="auto"
              >
                {p.isHost && (
                  <span className="text-highlight" aria-label="Host" title="Host">
                    👑
                  </span>
                )}
                <span className="truncate">{p.name}</span>
                {isLeft && (
                  <span className="text-[10px] uppercase tracking-wider text-ink-subtle shrink-0">
                    left
                  </span>
                )}
                {!isLeft && isMe && (
                  <span className="text-[10px] uppercase tracking-wider text-accent shrink-0">
                    you
                  </span>
                )}
              </span>
              <span className="text-xs tabular-nums shrink-0">
                <span
                  className={
                    isLeft
                      ? 'text-ink-subtle'
                      : isMe
                      ? 'text-ink font-semibold'
                      : 'text-ink-subtle'
                  }
                >
                  {p.score}
                </span>
                <span className="text-ink-subtle"> / {totalQuestions}</span>
              </span>
            </div>

            <SegmentedProgress segments={segments} />
          </div>
        );
      })}
    </div>
  );
}