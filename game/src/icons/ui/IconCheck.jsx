// game/src/components/icons/ui/IconCheck.jsx
// The classic checkmark — used in "✓ Saved" indicators and select-all rows.
import { base } from '../_base.js';

export function IconCheck({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}