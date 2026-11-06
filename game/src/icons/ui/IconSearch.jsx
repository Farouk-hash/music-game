// game/src/components/icons/ui/IconSearch.jsx
// Magnifying glass — used in SearchBar and any future filter affordances.
import { base } from '../_base.js';

export function IconSearch({ className }) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}