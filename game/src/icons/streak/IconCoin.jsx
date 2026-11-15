// game/src/components/icons/ui/IconCoin.jsx
export function IconCoin({ className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Base shadow / bottom layer */}
      <ellipse cx="8" cy="12" rx="5" ry="2" fill="currentColor" opacity="0.2" />
      
      {/* Middle layer */}
      <path d="M3 10V11.5C3 12.6046 5.23858 13.5 8 13.5C10.7614 13.5 13 12.6046 13 11.5V10" />
      
      {/* Top layer (the main coin face) */}
      <ellipse cx="8" cy="9" rx="5" ry="2" fill="var(--surface-2)" />
      
      {/* Inner rim detail */}
      <ellipse cx="8" cy="9" rx="3.5" ry="1.25" />
    </svg>
  );
}