// game/src/components/icons/music/IconArtists.jsx
import { base } from '../_base.js';

export function IconArtists({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}