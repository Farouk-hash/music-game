// game/src/components/domain/Setup/Years/StrictModeToggle.jsx
import { IconStrict } from '../../../../lib/icons.jsx';

/**
 * Strict years toggle — pill style with a funnel icon.
 */
export function StrictModeToggle({ value, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      title={value ? 'Strict years ON' : 'Strict years OFF'}
      className={[
        'inline-flex items-center justify-center gap-2 shrink-0',
        'h-9 px-3 rounded-md border text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        disabled && 'opacity-40 cursor-not-allowed',
        value
          ? 'bg-accent text-bg border-accent hover:bg-accent-2'
          : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
      ].join(' ')}
    >
      <IconStrict className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline">Strict</span>
    </button>
  );
}