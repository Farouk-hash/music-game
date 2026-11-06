// game/src/components/icons/profile/IconUserMinus.jsx
// Person with an X — "Unfollow" / "Cancel follow request".
import { base } from '../_base.js';

export function IconUserMinus({ className }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" />
      <path d="M16 9l5 5" />
      <path d="M21 9l-5 5" />
    </svg>
  );
}