// game/src/components/domain/Sporcle/PlayerRoster.jsx

import { PlayerAvatar } from "../../Avatar";

/**
 * Live list of players in the room.
 *
 * Each row shows:
 *   - host crown (👑) if isHost
 *   - name (or "left" state)
 *   - ready tick (lobby only)
 *   - running score (in-game and finished)
 *   - lock icon (question phase, when the player has answered)
 *
 * The `phase` prop controls which indicators are visible — in lobby we
 * care about ready; in-game we care about locked/score.
 *
 * Players marked `left: true` render dimmed with a strikethrough name
 * and a "left" badge, so the change persists across phase swaps
 * between PlayerRoster and SporcleProgress.
 */
export function PlayerRoster({ players = [], phase = 'lobby', myId = null , avatarStyle}) {
  const inLobby = phase === 'lobby';
  const inGame = phase !== 'lobby' && phase !== 'finished';

  return (
    <ul className="space-y-2">
      {players.map((p) => {
        const isMe = p.id === myId;
        const isLeft = !!p.left;
        return (
          <li
            key={p.id}
            className={[
              'flex items-center gap-3 rounded-md border px-4 py-3 transition-colors',
              isLeft
                ? 'border-border bg-surface-2 opacity-50'
                : isMe
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface-2',
            ].join(' ')}
          >

            <PlayerAvatar
              seed={p.name}
              style={avatarStyle}
              size={32}
              ring={isMe && !isLeft ? 'ring-accent' : 'ring-border'}
            />
            {/* Name + host crown + status */}
            <span className="flex-1 min-w-0 flex items-center gap-2">
              {p.isHost && (
                <span
                  className="text-highlight"
                  title="Host"
                  aria-label="Host"
                >
                  👑
                </span>
              )}
              <span
                className={[
                  'font-medium truncate',
                  isLeft ? 'text-ink-subtle line-through' : 'text-ink',
                ].join(' ')}
                dir="auto"
              >
                {p.name}
              </span>
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

            {/* Ready tick — lobby */}
            {inLobby && !p.isHost && !isLeft && (
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold shrink-0',
                  p.ready
                    ? 'bg-correct-soft text-correct'
                    : 'bg-surface text-ink-subtle border border-border',
                ].join(' ')}
                title={p.ready ? 'Ready' : 'Not ready'}
              >
                {p.ready ? '✓' : '—'}
              </span>
            )}

            {/* Locked indicator — in-game */}
            {inGame && !isLeft && (
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm shrink-0',
                  p.locked
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface text-ink-subtle border border-border',
                ].join(' ')}
                title={p.locked ? 'Answered' : 'Waiting'}
              >
                {p.locked ? '✓' : '…'}
              </span>
            )}

            {/* Score — in-game and finished */}
            {(inGame || phase === 'finished') && (
              <span
                className={[
                  'text-sm font-semibold tabular-nums shrink-0 min-w-[2rem] text-right',
                  isLeft ? 'text-ink-subtle' : 'text-ink',
                ].join(' ')}
              >
                {p.score}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}