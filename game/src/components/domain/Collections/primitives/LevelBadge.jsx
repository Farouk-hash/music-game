// game/src/components/domain/Collections/LevelBadge.jsx

const STYLE_BY_LEVEL = {
  1: 'bg-accent-soft text-accent border-accent',
  2: 'bg-highlight-soft text-highlight border-highlight',
  3: 'bg-surface-2 text-ink-muted border-border',
};

export function LevelBadge({ level }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center h-5 min-w-[1.5rem] px-1.5 rounded border text-[10px] font-semibold tracking-wide',
        STYLE_BY_LEVEL[level] ?? 'bg-surface-2 text-ink-muted border-border',
      ].join(' ')}
      aria-label={`Level ${level}`}
    >
      L{level}
    </span>
  );
}

export function LevelBadges({ levels }) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {levels.map((l) => <LevelBadge key={l} level={l} />)}
    </div>
  );
}