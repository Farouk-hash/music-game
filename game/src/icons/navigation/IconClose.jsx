// game/src/components/icons/navigation/IconClose.jsx
// Formerly IconX. Universal "close / dismiss / clear" affordance.
import { base } from '../_base.js';

export function IconClose({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}