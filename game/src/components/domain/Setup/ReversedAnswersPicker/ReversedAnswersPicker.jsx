// game/src/components/domain/Setup/ReversedAnswersPicker/ReversedAnswersPicker.jsx

const OPTIONS = [
  {
    value: 'no',
    label: 'No',
    hint: 'Answers shown normally',
  },
  {
    value: 'some',
    label: 'Some',
    hint: 'About half the rounds reversed',
  },
  {
    value: 'all',
    label: 'All',
    hint: 'Every round reversed',
  },
];

/**
 * Segmented control: No / Some / All.
 * Reversal flips the answer options — word order swapped, or letters
 * scrambled — making the challenge about reading through the noise.
 */
export function ReversedAnswersPicker({ value = 'no', onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={[
                'rounded-md border px-4 py-3 text-left transition-colors',
                selected
                  ? 'bg-accent-soft border-accent text-ink'
                  : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2 hover:text-ink',
              ].join(' ')}
            >
              <p className="text-sm font-semibold flex items-center gap-1.5">
                {selected && <span aria-hidden="true">✓</span>}
                {opt.label}
              </p>
              <p className="text-xs mt-0.5 opacity-80">{opt.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}