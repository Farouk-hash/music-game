// game/src/components/icons/collections/IconTrash.jsx
// Lid + body + two vertical lines — the classic trash.
import { base } from '../_base.js';

export function IconTrash({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16" />
      <path d="M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z" />
      <path d="M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}