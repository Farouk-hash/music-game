// game/src/components/domain/Profile/HeartButton.jsx
/**
 * Small heart toggle. Rendered inside tile corners.
 *
 * stopPropagation so the click doesn't trigger the tile's onClick.
 * onMouseDown also stops so touch devices don't double-fire.
 */
export function HeartButton({ active, onClick, size = 16, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-pressed={active}
      aria-label={label ?? (active ? 'Remove from favourites' : 'Add to favourites')}
      title={active ? 'Remove from favourites' : 'Add to favourites'}
      className={[
        'flex items-center justify-center shrink-0 rounded-full transition-all',
        'h-7 w-7',
        'hover:scale-110',
        active ? 'text-wrong' : 'text-white/70 hover:text-wrong',
      ].join(' ')}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}