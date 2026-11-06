// game/src/components/domain/Collections/tiles/CollectionTileAction.jsx
import { IconTrash } from "@/icons";

/**
 * Small trash button for collection tiles. Rendered in the tile's
 * action slot (top-left in grid/dense, right side in list — same
 * place the heart sits in Genre/Artist tiles).
 *
 * stopPropagation so the click doesn't trigger the tile's
 * onTileClick (which opens the edit modal).
 */
export function CollectionTileAction({ onClick, label = 'Delete collection' }) {
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
      aria-label={label}
      title={label}
      className={[
        'flex items-center justify-center shrink-0 rounded-full transition-all',
        'h-7 w-7',
        'hover:scale-110',
        'bg-black/40 text-white/80 hover:bg-wrong hover:text-white',
      ].join(' ')}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
    >
      <IconTrash className="w-3.5 h-3.5 shrink-0" />
    </button>
  );
}