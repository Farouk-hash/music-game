// game/src/components/ui/Toggle.jsx
/**
 * Generic checkbox + label toggle.
 *
 * Controlled component — parent owns the state. The checkbox uses
 * `accent-accent` so the native tick matches the copper theme.
 *
 *   <Toggle
 *     checked={value}
 *     onChange={setValue}                // receives boolean
 *     label="Strict years"
 *     disabled={false}
 *     title="Hide artists with no albums in the selected years"
 *     disabledTitle="Pick at least one year to enable strict mode"
 *   />
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  title,
  disabledTitle,
  className = '',
}) {
  return (
    <label
      className={[
        'inline-flex items-center gap-2 select-none text-xs transition-colors',
        disabled
          ? 'text-ink-subtle cursor-not-allowed'
          : 'text-ink-muted hover:text-ink cursor-pointer',
        className,
      ].join(' ')}
      title={disabled ? disabledTitle : title}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-accent disabled:opacity-40"
      />
      <span>{label}</span>
    </label>
  );
}