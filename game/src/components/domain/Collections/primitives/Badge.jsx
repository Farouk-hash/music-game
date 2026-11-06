// game/src/components/ui/Badge.jsx
export function Badge({ children, isMine = true, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center h-5 px-1.5 rounded border text-[10px] font-semibold uppercase tracking-wide shrink-0',
        isMine
          ? 'bg-accent-soft text-accent border-accent'       // MINE: Copper
          : 'bg-highlight-soft text-highlight border-highlight', // OTHERS: Gold
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}