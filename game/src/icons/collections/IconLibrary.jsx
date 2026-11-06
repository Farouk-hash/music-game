// game/src/components/icons/collections/IconLibrary.jsx
// Stack of books — a "library" of saved collections.
import { base } from '../_base.js';

export function IconLibrary({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4v16" />
      <path d="M9 4v16" />
      <path d="M13 4v16" />
      <rect x="16.5" y="4" width="3" height="16" rx="0.5" />
    </svg>
  );
}