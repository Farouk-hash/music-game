// game/src/components/domain/RoundCountPicker.jsx
//
// Round-count selector. Sends the chosen number as `count` to /play.

const OPTIONS = [
  { value: 5,  label: '5',  hint: 'Quick' },
  { value: 10, label: '10', hint: 'Standard' },
  { value: 15, label: '15', hint: 'Long' },
  { value: 20, label: '20', hint: 'Marathon' },
];

export function RoundCountPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-sm font-semibold">{opt.label}</p>
            <p className="text-xs mt-0.5 opacity-80">{opt.hint}</p>
          </button>
        );
      })}
    </div>
  );
}