// game/src/components/domain/Setup/Instruments/InstrumentsPicker.jsx

import { INSTRUMENT_OPTIONS } from "@/constants";

export function InstrumentsPicker({ value, onChange, disabled = false }) {
  return (
    <div className="flex gap-2">
      {INSTRUMENT_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            // We remove `disabled={disabled}` here so it stays colorful.
            // The parent wrapper (`SharedGameSettings`) uses `pointer-events-none` 
            // to block clicks in read-only mode.
            onClick={() => !disabled && onChange(opt.value)}
            aria-pressed={active}
            aria-disabled={disabled}
            className={[
              'flex-1 py-2 rounded-md border text-sm font-medium transition-colors',
              // Only apply opacity-40 if disabled AND not active, to show the active one clearly
              disabled && !active ? 'opacity-40 cursor-not-allowed' : '',
              disabled && active ? 'cursor-default' : '',
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