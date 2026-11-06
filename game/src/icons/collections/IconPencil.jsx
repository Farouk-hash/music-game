// game/src/components/icons/collections/IconPencil.jsx
// Pencil — "Edit" affordance.
import { base } from '../_base.js';

export function IconPencil({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M16 3.5l4.5 4.5-13 13H3v-4.5l13-13z" />
      <path d="M13 6.5l4.5 4.5" />
    </svg>
  );
}