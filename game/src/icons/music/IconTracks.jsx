// game/src/components/icons/music/IconTracks.jsx
import { base } from '../_base.js';

export function IconTracks({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}