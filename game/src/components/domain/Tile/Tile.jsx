// game/src/components/game/Tile.jsx
//
// A single selectable tile. Used for genres, artists, difficulty levels,
// and any future picker. Background is either an image URL or a soft
// accent tint with a large initial letter (fallback).
//
// The outer element is a <div role="button"> rather than <button>,
// so callers can slot in a sibling <button> (e.g. a heart toggle)
// without producing invalid nested-button HTML.

import { Image } from "../../ui/Image";

export function Tile({
  title,
  subtitle,
  image,
  fallbackLetter,
  selected = false,
  onToggle,
  disabled = false,
  heart = null,
}) {
  function handleClick() {
    if (disabled) return;
    onToggle?.();
  }

  function handleKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'group relative overflow-hidden text-left cursor-pointer',
        'rounded-md border transition-all duration-150',
        'aspect-[4/3] w-full select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
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

      {/* Heart — top-left corner */}
      {heart && (
        <div className="absolute top-2 left-2 z-20">
          {heart}
        </div>
      )}

      {/* Corner selection badge — top-right */}
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
    </div>
  );
}