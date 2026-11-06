// game/src/components/icons/ui/IconCloud.jsx
export function IconCloud({ className = 'w-4 h-4' }) {
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
      {/* Cloud path */}
      <path d="M4.5 12.5a3 3 0 0 1-.35-5.98A4 4 0 0 1 11.9 7.1a2.5 2.5 0 0 1-.4 5.4H4.5Z" />
      {/* Up arrow */}
      <path d="M8 14V9" />
      <path d="M6 11l2-2 2 2" />
    </svg>
  );
}