// game/src/components/icons/collections/IconPlus.jsx
// Used by "+ Add round", "+ New collection", restore-from-code.
import { base } from '../_base.js';

export function IconPlus({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}