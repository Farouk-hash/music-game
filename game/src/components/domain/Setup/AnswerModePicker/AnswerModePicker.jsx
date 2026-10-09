// game/src/components/domain/AnswerModePicker/AnswerModePicker.jsx
const OPTIONS = [
  { value: 'choose', label: 'Choose', hint: 'Multiple choice' },
  { value: 'type',   label: 'Type',   hint: 'Write the answer' },
];

export function AnswerModePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
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