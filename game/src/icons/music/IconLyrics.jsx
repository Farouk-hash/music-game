// game/src/components/icons/music/IconLyrics.jsx
import { base } from '../_base.js';

export function IconLyrics({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h13" />
      <path d="M4 11h9" />
      <path d="M4 16h6" />
      <circle cx="17" cy="17" r="2" />
      <path d="M19 17V9l3-1" />
    </svg>
  );
}