// game/src/components/icons/ui/IconList.jsx
import { base } from '../_base.js';

export function IconList({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}