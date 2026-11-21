// game/src/components/domain/Rounds/LifelinesBar.jsx
import { IconChevronRight, IconEye, IconMinus } from '@/icons';
import { LIFELINE_COST } from '@/constants/lifelines';

function Pill({ icon, label, count, cost, disabled, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={[
        'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs font-medium transition-colors',
        disabled
          ? 'opacity-30 cursor-not-allowed bg-surface-2 text-ink-muted border-border'
          : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
      ].join(' ')}
    >
      <span aria-hidden>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className="tabular-nums">({count})</span>
      {cost > 0 && (
        <span className="text-[10px] text-wrong font-mono">−{cost}</span>
      )}
    </button>
  );
}

export function LifelinesBar({
  lifelines,
  onSkip,
  onRemove,
  onReveal,
  disabled = false,
  removeDisabled = false, // <--- ADD THIS
}) {
  if (lifelines.allZero) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.15em] text-ink-subtle">
        Lifelines
      </span>
      <Pill
        icon={<IconChevronRight className="w-3.5 h-3.5" />}
        label="Skip"
        count={lifelines.skipsLeft}
        cost={LIFELINE_COST.skips}
        disabled={disabled || !lifelines.canSkip}
        onClick={onSkip}
        title={`Skip this question (counts as wrong, ${LIFELINE_COST.skips === 0 ? 'free' : `cost ${LIFELINE_COST.skips} pts`})`}
      />
      <Pill
        icon={<IconMinus className="w-3.5 h-3.5" />}
        label="Remove one"
        count={lifelines.removesLeft}
        cost={LIFELINE_COST.removes}
        disabled={disabled || !lifelines.canRemove || removeDisabled} // <--- ADD removeDisabled
        onClick={onRemove}
        title={`Hide one wrong option (cost ${LIFELINE_COST.removes} pts)`}
      />
      <Pill
        icon={<IconEye className="w-3.5 h-3.5" />}
        label="Reveal"
        count={lifelines.revealsLeft}
        cost={LIFELINE_COST.reveals}
        disabled={disabled || !lifelines.canReveal}
        onClick={onReveal}
        title={`Show the correct answer (cost ${LIFELINE_COST.reveals} pts)`}
      />
    </div>
  );
}