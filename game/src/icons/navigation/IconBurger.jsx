// game/src/components/icons/navigation/IconBurger.jsx
// Three horizontal lines — the mobile account-menu trigger.
import { base } from '../_base.js';

export function IconBurger({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}