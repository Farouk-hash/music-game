// game/src/components/icons/profile/IconUser.jsx
import { base } from '../_base.js';

export function IconUser({ className }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}