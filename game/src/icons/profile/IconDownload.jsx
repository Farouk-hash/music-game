// game/src/components/icons/profile/IconDownload.jsx
// Arrow pointing down into a tray — "restore from another device".
// Used by ProfileModal's restore action.
import { base } from '../_base.js';

export function IconDownload({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}