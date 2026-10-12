import { TIMER_SECONDS } from "../../../../hooks/rounds/usePlayParams";

export function TimerPicker({ value, onChange, answerMode }) {
  const perQuestion = answerMode === 'type'
    ? TIMER_SECONDS.type
    : TIMER_SECONDS.choose;

  const OPTIONS = [
    { value: 'off', label: 'No timer', hint: 'Take your time' },
    { value: 'on',  label: 'Timed',    hint: `${perQuestion}s per question` },
  ];

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