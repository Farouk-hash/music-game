// game/src/components/icons/music/IconAlbums.jsx
import { base } from '../_base.js';

export function IconAlbums({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="3" width="14" height="14" rx="2" />
      <rect x="4" y="6" width="14" height="14" rx="2" />
      <circle cx="11" cy="13" r="2" />
    </svg>
  );
}