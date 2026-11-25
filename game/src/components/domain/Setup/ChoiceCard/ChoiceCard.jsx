export function ChoiceCard({ active, onClick, title, description, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={[
        // ✅ PURE FLEX: No w-full, no min-w. Just grow to fill available space.
        'flex-1 shrink-0 text-left p-3 rounded-md border transition-colors space-y-1', 
        active
          ? 'bg-accent-soft border-accent text-ink'
          : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2',
        disabled ? 'cursor-default opacity-80' : '',
      ].join(' ')}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[11px] leading-snug whitespace-normal break-words">
        {description}
      </p>
    </button>
  );
}