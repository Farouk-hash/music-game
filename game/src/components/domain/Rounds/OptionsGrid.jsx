// game/src/components/game/OptionsGrid.jsx
import { applyReversal } from '@/lib/reverseText.js';

export function OptionsGrid({
  options,
  correctValue,
  picked,
  revealed,
  onPick,
  labelFor = (opt) => opt.label,
  reversal = { reversed: false, style: null },
}) {
  const { reversed, style } = reversal;

  const renderLabel = (option) => {
    const base = labelFor(option);
    if (!reversed || !style) return base;
    return applyReversal(base, style);
  };

  const locked = picked != null && !revealed;

  return (
    // 1. Ensure the grid takes full width and columns can shrink
    <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full min-w-0">
      {options.map((option) => {
        const isPicked = picked === option.value;
        const isCorrect = option.value === correctValue;

        let buttonStyle = 'bg-surface-2 border-border text-ink hover:border-accent-2';
        if (revealed) {
          if (isCorrect) buttonStyle = 'bg-correct-soft border-correct text-ink';
          else if (isPicked) buttonStyle = 'bg-wrong-soft border-wrong text-ink';
          else buttonStyle = 'bg-surface-2 border-border text-ink-muted opacity-60';
        } else if (locked) {
          if (isPicked) buttonStyle = 'bg-accent text-bg border-accent';
          else buttonStyle = 'bg-surface-2 border-border text-ink-muted opacity-40';
        }

        const label = renderLabel(option);

        return (
          <button
            key={option.value}
            type="button"
            disabled={revealed || locked}
            onClick={() => onPick(option.value)}
            className={[
              // 2. Add w-full, min-w-0, and text wrapping
              'w-full min-w-0 rounded-md border px-4 py-3 text-left text-sm font-medium',
              'transition-colors disabled:cursor-not-allowed',
              'break-words whitespace-normal', // <-- Fixes long text breaking layout
              buttonStyle,
            ].join(' ')}
          >
            <span 
              dir={reversed ? 'ltr' : 'auto'} 
              className="block w-full"
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}