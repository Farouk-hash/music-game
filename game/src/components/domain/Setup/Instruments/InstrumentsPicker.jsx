// game/src/components/domain/Setup/Instruments/InstrumentsPicker.jsx
/**
 * Three-button picker for the `instruments` mode.
 *
 *   none  — original audio (vocals included)
 *   mixed — half the rounds use instruments (no vocals)
 *   all   — every round uses instruments
 */
export function InstrumentsPicker({ value, onChange, disabled = false }) {
  const OPTIONS = [
    { key: 'none',  label: 'None',  hint: 'Vocals included' },
    { key: 'mixed', label: 'Mixed', hint: '50 / 50' },
    { key: 'all',   label: 'All',   hint: 'No vocals' },
  ];

  return (
    <div className="flex gap-2">
      {OPTIONS.map(opt => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={[
              'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              active
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
            ].join(' ')}
          >
            <div className="leading-tight">
              <div>{opt.label}</div>
              <div
                className={[
                  'text-[10px] mt-0.5',
                  active ? 'text-bg/70' : 'text-ink-subtle',
                ].join(' ')}
              >
                {opt.hint}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}