// game/src/components/icons/setup/IconSelectAll.jsx
import { base } from '../_base.js';

export function IconSelectAll({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M3 6h.01M7 6h14" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M3 12h.01M7 12h14" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M3 18h.01M7 18h14" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M1 4l1.5 1.5L5 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 10l1.5 1.5L5 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}