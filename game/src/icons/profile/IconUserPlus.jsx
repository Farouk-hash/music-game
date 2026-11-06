// game/src/components/icons/profile/IconUserPlus.jsx
// Person with a plus — "Follow" affordance.
import { base } from '../_base.js';

export function IconUserPlus({ className }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" />
      <path d="M18 8v6" />
      <path d="M15 11h6" />
    </svg>
  );
}