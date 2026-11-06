// game/src/components/icons/music/IconInstruments.jsx
import { base } from '../_base.js';

export function IconInstruments({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9v6" />
      <path d="M8 6v12" />
      <path d="M12 8v8" />
      <path d="M16 6v12" />
      <path d="M20 9v6" />
      <path d="M3 3l18 18" />
    </svg>
  );
}