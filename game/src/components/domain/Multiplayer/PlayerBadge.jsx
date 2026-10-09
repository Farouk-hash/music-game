// game/src/components/domain/Multiplayer/PlayerBadge.jsx
export function PlayerBadge({ currentIndex, players, scores }) {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {players.map((name, i) => {
        const isCurrent = i === currentIndex;
        return (
          <span
            key={i}
            className={[
              'px-2 py-1 rounded-full border transition-colors',
              isCurrent
                ? 'bg-accent-soft border-accent text-ink font-medium'
                : 'bg-surface-2 border-border text-ink-subtle',
            ].join(' ')}
          >
            <span dir="auto">{name}</span>
            <span className="ml-1.5 tabular-nums">{scores[i] ?? 0}</span>
          </span>
        );
      })}
    </div>
  );
}