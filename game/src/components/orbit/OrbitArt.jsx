// game/src/components/domain/Home/OrbitArt.jsx
import { useId } from 'react';
import './OrbitArt.css';
import imageUrl from '@/assets/raffat.png'
/** 72 bezel ticks (every 5°), a longer one every 30°. Computed once. */
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const major = i % 6 === 0;
  const a = (i * 5 * Math.PI) / 180;
  const r2 = major ? 93.5 : 96.5;
  const f = (n) => Number(n.toFixed(3));
  return {
    major,
    x1: f(100 + 100 * Math.sin(a)),
    y1: f(100 - 100 * Math.cos(a)),
    x2: f(100 + r2 * Math.sin(a)),
    y2: f(100 - r2 * Math.cos(a)),
  };
});

/** Equalizer bars around the record. Deterministic, so server and client agree. */
const BAR_COUNT = 56;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => ({
  angle: (i * 360) / BAR_COUNT,
  t: Math.abs(0.5 - i / BAR_COUNT) * 2,
  dur: 0.45 + ((i * 37) % 11) / 20,
  delay: ((i * 13) % 10) / 10,
  lo: 0.18 + ((i * 7) % 5) * 0.04,
}));

/** Notes that rise through the dial */
const NOTES = [
  { glyph: '♪', x: 30, s: 9, drift: -8, dur: 9, delay: 0, rot: -14, peak: 0.85 },
  { glyph: '♫', x: 44, s: 11, drift: 10, dur: 11, delay: -3, rot: 12, peak: 0.7 },
  { glyph: '♩', x: 58, s: 8, drift: -12, dur: 10, delay: -6, rot: -10, peak: 0.8 },
  { glyph: '♬', x: 70, s: 10, drift: 8, dur: 12, delay: -8, rot: 16, peak: 0.65 },
  { glyph: '♪', x: 38, s: 7, drift: 14, dur: 8, delay: -5, rot: 8, peak: 0.75 },
  { glyph: '♫', x: 52, s: 9, drift: -6, dur: 13, delay: -2, rot: -18, peak: 0.6 },
  { glyph: '♩', x: 64, s: 7, drift: 11, dur: 9.5, delay: -7, rot: 14, peak: 0.7 },
  { glyph: '♪', x: 24, s: 8, drift: -4, dur: 10.5, delay: -4, rot: -8, peak: 0.65 },
];

/** Beamed notes, used on the orbiting discs */
function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="orbit__note-icon" fill="none" aria-hidden="true">
      <path d="M9 17.5V5.5l10-2v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="2.6" fill="currentColor" />
    </svg>
  );
}

/** Headphones that circle on the tilted ellipse */
function HeadphonesSprite() {
  return (
    <span className="orbit__phones">
      <svg viewBox="0 0 24 24" fill="none" className="orbit__phones-svg" aria-hidden="true">
        <path d="M4.5 14v-2a7.5 7.5 0 0115 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3" y="13" width="4.2" height="7" rx="1.6" fill="currentColor" />
        <rect x="16.8" y="13" width="4.2" height="7" rx="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function OrbitArt({
  className = '',
  playing = false,
  progress = null,
  ringText = 'NAME THAT TRACK • TEN ROUNDS • ONE CLEAR ANSWER • ',
}) {
  const pathId = `orbit-text-${useId().replace(/:/g, '')}`;
  const showProgress = progress !== null && progress !== undefined;
  const clamped = showProgress ? Math.min(1, Math.max(0, progress)) : 0;

  return (
    <div
      aria-hidden="true"
      className={`orbit ${playing ? 'orbit--playing' : ''} ${className}`}
    >
      <div className="orbit__glow" />

      <div className="orbit__ring" />
      <div className="orbit__ring orbit__ring--inner" />

      <svg viewBox="0 0 200 200" className="orbit__ticks">
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeWidth={t.major ? 1.1 : 0.6}
            strokeLinecap="round"
            opacity={t.major ? 0.9 : 0.5}
          />
        ))}
      </svg>

      {showProgress && (
        <svg viewBox="0 0 200 200" className="orbit__progress">
          <circle
            cx="100"
            cy="100"
            r="98.2"
            pathLength="100"
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray={`${clamped * 100} 100`}
          />
        </svg>
      )}

      <svg viewBox="0 0 200 200" className="orbit__text">
        <defs>
          <path id={pathId} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        </defs>
        <text fill="currentColor" fontSize="5.6" fontWeight="600" textLength="464" lengthAdjust="spacing">
          <textPath href={`#${pathId}`}>{ringText.repeat(2)}</textPath>
        </text>
      </svg>

      <div className="orbit__eq">
        {BARS.map((b, i) => (
          <span key={i} className="orbit__bar" style={{ '--a': `${b.angle}deg` }}>
            <span
              className="orbit__bar-fill"
              style={{ '--t': b.t, '--dur': b.dur, '--delay': b.delay, '--lo': b.lo }}
            />
          </span>
        ))}
      </div>

      <div className="orbit__waves">
        {[0, 1, 2].map((i) => (
          <span key={i} className="orbit__wave" style={{ '--i': i }} />
        ))}
      </div>

      <div className="orbit__vinyl">
        <div className="orbit__record">
          <div 
            className="orbit__label"
            style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}}
          >
            <span className="orbit__notch" />
          </div>
        </div>
        <span className="orbit__spindle" />
      </div>

      <div className="orbit__notes">
        {NOTES.map((n, i) => (
          <span
            key={i}
            className="orbit__note"
            style={{
              '--x': n.x, '--s': n.s, '--drift': n.drift, '--dur': n.dur,
              '--delay': n.delay, '--rot': `${n.rot}deg`, '--peak': n.peak,
            }}
          >
            {n.glyph}
          </span>
        ))}
      </div>

      <div className="orbit__tilt">
        <div className="orbit__tilt-line" />
        <div className="orbit__ex">
          <div className="orbit__ey">
            <HeadphonesSprite />
          </div>
        </div>
      </div>

      <svg viewBox="0 0 100 100" className="orbit__arm">
        <g className="orbit__arm-g">
          <circle cx="82" cy="16" r="4.4" className="orbit__arm-base" />
          <circle cx="82" cy="16" r="1.6" className="orbit__arm-pin" />
          <line x1="82" y1="16" x2="60" y2="40" className="orbit__arm-rod" />
          <line x1="85.2" y1="12.5" x2="87.4" y2="10.1" className="orbit__arm-weight" />
          <line x1="62.6" y1="37.2" x2="59.4" y2="40.8" className="orbit__arm-head" />
        </g>
      </svg>

      <div className="orbit__track orbit__track--outer" style={{ '--comet': 'var(--accent)' }}>
        <span className="orbit__tail" />
        <span className="orbit__sat">
          <span className="orbit__sat-face"><NoteIcon /></span>
        </span>
      </div>

      <div className="orbit__track orbit__track--inner" style={{ '--comet': 'var(--highlight)' }}>
        <span className="orbit__tail orbit__tail--rev" />
        <span className="orbit__sat">
          <span className="orbit__sat-face"><NoteIcon /></span>
        </span>
      </div>
    </div>
  );
}