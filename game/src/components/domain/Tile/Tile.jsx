// game/src/components/game/Tile.jsx
//
// A single selectable tile. Used for genres, artists, difficulty levels,
// and any future picker. Background is either an image URL or a soft
// accent tint with a large initial letter (fallback).

import { Image } from "../../ui/Image";

export function Tile({
  title,
  subtitle,
  image,
  fallbackLetter,
  selected = false,
  onToggle,
  disabled = false,
}) {

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'group relative overflow-hidden text-left',
        'rounded-md border transition-all duration-150',
        'aspect-[4/3] w-full',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        selected
          ? 'border-accent ring-2 ring-accent shadow-md'
          : 'border-border hover:border-accent-2 shadow-sm',
      ].join(' ')}
    >
      {/* Background — image or tinted fallback */}
      <Image
        src={image}
        alt=""
        fallbackLetter={fallbackLetter ?? title?.charAt(0)?.toUpperCase()}
        wrapperClass="absolute inset-0"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />

      {/* Dark gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

      {/* Corner selection badge */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={[
            'flex items-center justify-center w-6 h-6 rounded-full border',
            'transition-all duration-150',
            selected
              ? 'bg-accent border-accent text-bg'
              : 'bg-black/40 border-white/30 text-transparent',
          ].join(' ')}
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
            <path
              d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {/* Title block at the bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
        <p className="text-ink font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
          {title}
        </p>
        {subtitle && (
          <p className="text-ink-muted text-xs mt-0.5 line-clamp-1 drop-shadow">
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
}