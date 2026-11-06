// game/src/components/icons/music/IconGenres.jsx
import { base } from '../_base.js';

export function IconGenres({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M10 18V6l8-2v12" />
      <circle cx="7" cy="19" r="3" />
      <circle cx="15" cy="17" r="3" />
    </svg>
  );
}