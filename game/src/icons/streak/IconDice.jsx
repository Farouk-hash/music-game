// game/src/components/icons/ui/IconDice.jsx
export function IconDice({ className = 'w-4 h-4' }) {
  return (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 1.5L14 4.5L14 11.5L8 14.5L2 11.5L2 4.5L8 1.5Z" />
    <path d="M8 8L14 4.5M8 8L2 4.5M8 8V14.5" />
    <circle cx="5" cy="6" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="11" cy="6" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="8" cy="11" r="0.75" fill="currentColor" stroke="none" />
  </svg>
  );
}