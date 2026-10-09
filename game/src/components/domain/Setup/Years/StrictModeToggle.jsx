// game/src/components/domain/Setup/Years/StrictModeToggle.jsx
import { Toggle } from '../../../ui/Toggle.jsx';

/**
 * Strict mode for the year filter.
 *
 * When ON: selecting years narrows the artist grid — artists with no
 * albums in the selected years are hidden and removed from selection.
 * When OFF: years are informational only; the artist grid is unaffected.
 *
 * Disabled when no years are selected, since strict mode is inert
 * without a year filter.
 */
export function StrictModeToggle({ value, onChange, disabled = false }) {
  return (
    <Toggle
      checked={value}
      onChange={onChange}
      label="Strict years"
      disabled={disabled}
      title="Hide artists with no albums in the selected years"
      disabledTitle="Pick at least one year to enable strict mode"
    />
  );
}