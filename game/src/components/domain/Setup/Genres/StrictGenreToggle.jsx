// game/src/components/domain/Setup/Genres/StrictGenreToggle.jsx
import { Toggle } from '../../../ui/Toggle.jsx';

/**
 * Strict mode for the genre filter.
 *
 * When ON:  artists must have ALL selected genres (AND).
 *           Picking "Diva" + "Rap" shows only diva-rappers.
 * When OFF: artists match if they have ANY selected genre (OR) —
 *           today's default behavior.
 *
 * Disabled when fewer than two genres are selected — AND with zero
 * or one genre is identical to OR, so the toggle is inert.
 */
export function StrictGenreToggle({ value, onChange, disabled = false }) {
  return (
    <Toggle
      checked={value}
      onChange={onChange}
      label="Strict genres"
      disabled={disabled}
      title="Match artists who have ALL selected genres"
      disabledTitle="Pick at least two genres to enable strict mode"
    />
  );
}