// game/src/components/game/Tile.jsx
import { Image } from '@/components/ui/Image';

export function Tile({
  title,
  subtitle,
  image,
  fallbackLetter,
  selected = false,
  onToggle,
  onTileClick = null,
  disabled = false,
  heart = null,
  view = 'grid',
  className = '',
}) {
  const primaryHandler = onTileClick ?? onToggle;
  const showSelection = !onTileClick;

  function handleClick() {
    if (disabled) return;
    primaryHandler?.();
  }

  function handleKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      primaryHandler?.();
    }
  }

  const sharedProps = {
    role: 'button',
    tabIndex: disabled ? -1 : 0,
    'aria-pressed': showSelection ? selected : undefined,
    'aria-disabled': disabled || undefined,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  };

  const sharedClasses = [
    'group relative overflow-hidden text-left cursor-pointer select-none',
    'rounded-md border transition-all duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    disabled ? 'opacity-40 cursor-not-allowed' : '',
    showSelection && selected
      ? 'border-accent ring-2 ring-accent shadow-md'
      : 'border-border hover:border-accent-2 shadow-sm',
    className, // <-- Appended last so it overrides default borders
  ].join(' ');

  /* ── LIST VIEW ────────────────────────────────────── */
  if (view === 'list') {
    return (
      <div
        {...sharedProps}
        className={[sharedClasses, 'flex items-center gap-3 px-3 py-2.5'].join(' ')}
      >
        <div className="relative shrink-0 w-12 h-12 rounded-sm overflow-hidden">
          <Image
            src={image}
            alt=""
            fallbackLetter={fallbackLetter ?? title?.charAt(0)?.toUpperCase()}
            wrapperClass="absolute inset-0"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-ink font-medium text-sm leading-tight truncate">{title}</p>
          {subtitle && (
            <p className="text-ink-subtle text-xs mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {heart && <div className="shrink-0">{heart}</div>}

        {showSelection && (
          <span
            className={[
              'flex items-center justify-center w-5 h-5 rounded-full border shrink-0',
              'transition-all duration-150',
              selected
                ? 'bg-accent border-accent text-bg'
                : 'border-border text-transparent',
            ].join(' ')}
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none">
              <path
                d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
    );
  }

  /* ── DENSE GRID VIEW ──────────────────────────────── */
  if (view === 'dense') {
    return (
      <div
        {...sharedProps}
        className={[sharedClasses, 'aspect-square w-full'].join(' ')}
      >
        <Image
          src={image}
          alt=""
          fallbackLetter={fallbackLetter ?? title?.charAt(0)?.toUpperCase()}
          wrapperClass="absolute inset-0"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {heart && (
          <div className="absolute top-1 left-1 z-20 scale-90 origin-top-left">
            {heart}
          </div>
        )}

        {showSelection && (
          <div className="absolute top-1 right-1 z-10">
            <span
              className={[
                'flex items-center justify-center w-5 h-5 rounded-full border transition-all',
                selected
                  ? 'bg-accent border-accent text-bg'
                  : 'bg-black/40 border-white/30 text-transparent',
              ].join(' ')}
            >
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none">
                <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 px-2 py-1.5">
          <p className="text-ink font-semibold text-[11px] leading-tight truncate drop-shadow">
            {title}
          </p>
        </div>
      </div>
    );
  }

  /* ── GRID VIEW (default) ──────────────────────────── */
  return (
    <div
      {...sharedProps}
      className={[sharedClasses, 'aspect-[4/3] w-full'].join(' ')}
    >
      <Image
        src={image}
        alt=""
        fallbackLetter={fallbackLetter ?? title?.charAt(0)?.toUpperCase()}
        wrapperClass="absolute inset-0"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

      {heart && <div className="absolute top-2 left-2 z-20">{heart}</div>}

      {showSelection && (
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
      )}

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