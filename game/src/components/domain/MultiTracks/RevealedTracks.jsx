// game/src/components/game/RevealedTracks.jsx
import { useState, useRef, useEffect } from 'react';

/**
 * Post-round reveal: lists every track that was in the mix, each with
 * its own individual audio player. Only one plays at a time.
 *
 * Used at the end of a set (after the last question is answered) so the
 * player can hear each track solo and learn what they were listening to.
 */
export function RevealedTracks({ clips }) {
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioRefs = useRef([]);

  // When a new clip starts playing, pause the previous one
  useEffect(() => {
    audioRefs.current.forEach((a, i) => {
      if (!a) return;
      if (i === playingIndex) {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else {
        a.pause();
        a.currentTime = 0;
      }
    });
  }, [playingIndex]);

  function toggle(index) {
    setPlayingIndex((prev) => (prev === index ? null : index));
  }

  return (
    <div className="space-y-2">
      {clips.map((clip) => {
        const isPlaying = playingIndex === clip.index;
        return (
          <div
            key={clip.index}
            className={[
              'flex items-center gap-3 p-3 rounded-md border transition-colors',
              isPlaying
                ? 'border-accent bg-accent-soft'
                : 'border-border bg-surface-2',
            ].join(' ')}
          >
            {/* Play/pause button */}
            <button
              type="button"
              onClick={() => toggle(clip.index)}
              aria-label={isPlaying ? 'Pause' : `Play ${clip.trackName}`}
              className="
                w-9 h-9 rounded-full shrink-0
                bg-accent text-bg
                flex items-center justify-center
                hover:bg-accent-2 transition-colors
              "
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate" title={clip.trackName}>
                {clip.trackName}
              </p>
              <p className="text-xs text-ink-muted truncate">
                {clip.artistName}
              </p>
            </div>

            {/* Number badge */}
            <span className="text-xs text-ink-subtle tabular-nums shrink-0">
              #{clip.index + 1}
            </span>

            {/* Hidden per-row audio element */}
            <audio
              ref={(el) => { audioRefs.current[clip.index] = el; }}
              src={clip.serveUrl}
              preload="none"
              loop
              className="hidden"
            />
          </div>
        );
      })}
    </div>
  );
}