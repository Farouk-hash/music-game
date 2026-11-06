// game/src/components/icons/profile/IconFriends.jsx
// Two people — the friends entry icon (Header desktop + MobileUserMenu).
import { base } from '../_base.js';

export function IconFriends({ className }) {
  return (
    <svg {...base} className={className}>
      <circle cx="7" cy="7" r="3" />
      <path d="M2 17c0-2.5 2.24-4.5 5-4.5S12 14.5 12 17" />
      <circle cx="15" cy="6" r="2.25" />
      <path d="M13 12.5c1.4-.5 2.6-.5 3.6 0 1.2.6 1.9 1.7 1.9 3" />
    </svg>
  );
}