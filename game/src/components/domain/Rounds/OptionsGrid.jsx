// game/src/components/game/OptionsGrid.jsx
import { applyReversal } from '../../../lib/reverseText.js';

/**
 * The 2×2 answer grid.
 *
 * `reversal` — optional { reversed: bool, style: 'words'|'letters'|null }
 *              If reversed, every option label is transformed and the
 *              displayed text uses dir="ltr" so the scramble is visible.
 *
 * `labelFor` — transforms an option object into its display string
 *              (e.g. position label translation). Runs BEFORE reversal.
 *
 * Three visual states:
 *   - idle            — default. Hoverable, all clickable.
 *   - locked in       — `picked != null && !revealed`. Picked option is
 *                       accent-filled; others dimmed; all disabled.
 *   - revealed        — correct highlighted green; wrong pick highlighted
 *                       red; others dimmed; all disabled.
 */
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

  // Mid-question: the local player has answered, the round hasn't
  // revealed yet. Dim everything except the pick, and disable all
  // clicks so the grid reflects "locked in".
  const locked = picked != null && !revealed;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              'rounded-md border px-4 py-3 text-left text-sm font-medium',
              'transition-colors disabled:cursor-not-allowed',
              buttonStyle,
            ].join(' ')}
          >
            <span dir={reversed ? 'ltr' : 'auto'}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}