// game/src/components/icons/collections/IconCollection.jsx
// 2x2 grid of rounded squares — same shape as IconGrid but semantically
// "collection". Kept separate so the two can diverge if the design calls for it.
import { base } from '../_base.js';

export function IconCollection({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}