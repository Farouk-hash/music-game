// game/src/components/icons/music/IconReversed.jsx
import { base } from '../_base.js';

export function IconReversed({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M3 12h6" />
      <path d="M7 8l-4 4 4 4" />
      <path d="M21 12h-6" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  );
}