// game/src/components/icons/profile/IconShare.jsx
// Share / invite affordance — arrow emerging from a box.
import { base } from '../_base.js';

export function IconShare({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
    </svg>
  );
}