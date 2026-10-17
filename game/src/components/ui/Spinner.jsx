// game/src/components/ui/Spinner.jsx

const RING_SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

const ICON_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

function MusicNoteIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

/**
 * A loading indicator.
 *
 * Default: spinning accent ring.
 * With `icon`: a spinning/pulsing icon (SVG or component).
 *
 *   <Spinner />                                       // ring, md
 *   <Spinner size="lg" />                             // ring, lg
 *   <Spinner icon={<MusicNoteIcon />} />              // note, md
 *   <Spinner icon={<MusicNoteIcon />} size="lg" />    // note, lg
 *   <Spinner icon="🎵" />                              // emoji (fallback)
 */
export function Spinner({ size = 'md', icon = null, className = '' }) {
  // ── Icon variant ──
  if (icon) {
    // If the caller passed a raw string (emoji), wrap it in a span.
    // If they passed an SVG/component, it inherits the size via className.
    const iconClass = ICON_SIZES[size] ?? ICON_SIZES.md;

    const rendered =
      typeof icon === 'string' ? (
        <span className={['inline-flex', iconClass].join(' ')}>{icon}</span>
      ) : (
        // Clone so we can inject sizing without mutating the caller's element
        // Note: React.cloneElement only works if `icon` is a valid React element
        // with an existing className. For a raw <MusicNoteIcon /> element this
        // works — the SVG picks up the size class.
        <span className={['inline-flex', iconClass].join(' ')}>
          {icon}
        </span>
      );

    return (
      <span
        aria-hidden
        className={[
          'inline-flex items-center justify-center',
          'text-accent animate-pulse',
          className,
        ].join(' ')}
      >
        {rendered}
      </span>
    );
  }

  // ── Classic ring ──
  return (
    <span
      aria-hidden
      className={[
        'inline-block rounded-full',
        'border-accent/30 border-t-accent',
        'animate-spin',
        RING_SIZES[size] ?? RING_SIZES.md,
        className,
      ].join(' ')}
    />
  );
}

/**
 * Default SVG music note. Exported so callers can pass it as `icon`
 * without re-defining the path.
 */
export function SpinnerMusicNote() {
  return <MusicNoteIcon />;
}