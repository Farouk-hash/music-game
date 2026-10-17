// game/src/lib/icons.jsx
// Tiny inline icon set. Stroke uses currentColor so icons adopt
// whatever text color the parent applies (e.g. text-accent).

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};


export function IconGrid({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconList({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconDense({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="4" height="4" rx="0.5" />
      <rect x="10" y="3" width="4" height="4" rx="0.5" />
      <rect x="17" y="3" width="4" height="4" rx="0.5" />
      <rect x="3" y="10" width="4" height="4" rx="0.5" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" />
      <rect x="17" y="10" width="4" height="4" rx="0.5" />
      <rect x="3" y="17" width="4" height="4" rx="0.5" />
      <rect x="10" y="17" width="4" height="4" rx="0.5" />
      <rect x="17" y="17" width="4" height="4" rx="0.5" />
    </svg>
  );
}

export function IconGenres({ className }) {
  return (
    <svg {...base} className={className}>
      {/* A balanced music note spanning roughly the same bounding box as the Artist icon */}
      <path d="M10 18V6l8-2v12" />
      <circle cx="7" cy="19" r="3" />
      <circle cx="15" cy="17" r="3" />
    </svg>
  );
}
export function IconArtists({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

export function IconStrict({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Funnel / Filter icon - slightly scaled down to balance with other icons */}
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" />
    </svg>
  );
}

export function IconSelectAll({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Three rows, first two have checkmarks */}
      <path d="M3 6h.01M7 6h14" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M3 12h.01M7 12h14" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M3 18h.01M7 18h14" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M1 4l1.5 1.5L5 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 10l1.5 1.5L5 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCalendar({ className }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

export function IconX({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconTracks({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

export function IconClips({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v18" />
      <path d="M5 8v8" />
      <path d="M19 8v8" />
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

export function IconAlbums({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Back sleeve */}
      <rect x="6" y="3" width="14" height="14" rx="2" />
      {/* Front sleeve */}
      <rect x="4" y="6" width="14" height="14" rx="2" />
      {/* Center hole / label */}
      <circle cx="11" cy="13" r="2" />
    </svg>
  );
}

export function IconLyrics({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Lines of text */}
      <path d="M4 6h13" />
      <path d="M4 11h9" />
      <path d="M4 16h6" />
      {/* Small note glyph on the right — signals "song", not "document" */}
      <circle cx="17" cy="17" r="2" />
      <path d="M19 17V9l3-1" />
    </svg>
  );
}

export function IconReversed({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Two arrows pointing opposite directions — reads as "flip" */}
      <path d="M3 12h6" />
      <path d="M7 8l-4 4 4 4" />
      <path d="M21 12h-6" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  );
}


export function IconEye({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ className }) {
  return (
    <svg {...base} className={className}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6.5 0-10-8-10-8a18.6 18.6 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a18.7 18.7 0 0 1-3.16 4.19" />
      <path d="M1 1l22 22" />
    </svg>
  );
}


export function IconInstruments({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Waveform bars */}
      <path d="M4 9v6" />
      <path d="M8 6v12" />
      <path d="M12 8v8" />
      <path d="M16 6v12" />
      <path d="M20 9v6" />
      {/* Diagonal strike — signals "no vocals" */}
      <path d="M3 3l18 18" />
    </svg>
  );
}


export function IconDice({ className }) {
  return (
    <svg {...base} className={className}>
      {/* Rounded square box */}
      <rect x="3" y="3" width="18" height="18" rx="4" />
      {/* Dice dots */}
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}