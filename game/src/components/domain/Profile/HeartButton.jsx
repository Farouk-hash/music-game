// game/src/components/domain/Profile/HeartButton.jsx
import { IconHeart } from '@/icons';

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
      <IconHeart
        filled={active}
        className="shrink-0"
        style={{ width: size, height: size }}
      />
    </button>
  );
}