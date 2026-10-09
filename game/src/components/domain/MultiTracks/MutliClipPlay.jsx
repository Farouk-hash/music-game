import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

/**
 * Plays N clips simultaneously. The user has only master controls —
 * no way to hide or mute individual clips. That's the point of level 3.
 *
 * Props:
 *   clips: [{ serveUrl }]   (2 or more)
 *   autoPlay: start on mount
 *   loop: restart all clips together when the longest one ends
 */
export const MultiClipPlayer = forwardRef(function MultiClipPlayer(
  { clips, autoPlay = true, loop = true , compact = false},
  ref
) {
  const audioRefs = useRef([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset refs array when clips change
  useEffect(() => {
    audioRefs.current = audioRefs.current.slice(0, clips.length);
  }, [clips.length]);

  // Load sources when clips change
  useEffect(() => {
    if (!clips?.length) return;

    let cancelled = false;
    let loaded = 0;
    const durations = [];

    clips.forEach((clip, i) => {
      const a = audioRefs.current[i];
      if (!a) return;
      a.src = clip.serveUrl;
      a.currentTime = 0;
      a.addEventListener('loadedmetadata', function onMeta() {
        if (cancelled) return;
        durations[i] = a.duration || 0;
        loaded += 1;
        if (loaded === clips.length) {
          setDuration(Math.max(...durations.filter(Number.isFinite), 0));
        }
        a.removeEventListener('loadedmetadata', onMeta);
      });
    });

    setCurrentTime(0);
    setDuration(0);

    if (autoPlay) {
      // Try playing all — a user gesture may be needed on the first round.
      Promise.all(
        audioRefs.current.slice(0, clips.length).map(a => a?.play().catch(() => {}))
      );
    }

    return () => { cancelled = true; };
  }, [clips, autoPlay]);

  // Update master time from the longest-playing clip (index 0 is fine)
  useEffect(() => {
    const list = () => audioRefs.current.slice(0, clips.length).filter(Boolean);
    const all = list();
    if (all.length === 0) return;

    // Progress = the maximum currentTime across all clips.
    // As long as one clip is still playing, the bar keeps advancing.
    const onTime = () => {
        const max = Math.max(...all.map(a => a.currentTime || 0), 0);
        setCurrentTime(max);
    };

    const onPlay = () => setIsPlaying(true);

    // Only flip to "paused" when EVERY clip is paused.
    const onPause = () => {
        const anyPlaying = all.some(a => !a.paused);
        if (!anyPlaying) setIsPlaying(false);
    };

    // Loop/stop only when ALL clips have ended.
    const onEnded = () => {
        const anyPlaying = all.some(a => !a.paused && !a.ended);
        if (!anyPlaying) {
        if (loop) replayAll();
        else setIsPlaying(false);
        }
    };

    all.forEach(a => {
        a.addEventListener('timeupdate', onTime);
        a.addEventListener('play', onPlay);
        a.addEventListener('pause', onPause);
        a.addEventListener('ended', onEnded);
    });

    return () => {
        all.forEach(a => {
        a.removeEventListener('timeupdate', onTime);
        a.removeEventListener('play', onPlay);
        a.removeEventListener('pause', onPause);
        a.removeEventListener('ended', onEnded);
        });
    };
    }, [clips, loop]);
  function replayAll() {
    const list = audioRefs.current.slice(0, clips.length);
    list.forEach(a => {
      if (!a) return;
      a.currentTime = 0;
    });
    Promise.all(list.map(a => a?.play().catch(() => {})));
    setCurrentTime(0);
  }

  function togglePlay() {
    const list = audioRefs.current.slice(0, clips.length);
    const anyPlaying = list.some(a => a && !a.paused);
    if (anyPlaying) {
      list.forEach(a => a?.pause());
    } else {
      // If the mix has reached the end, restart from 0
      const atEnd = list.every(a => !a || a.ended || a.currentTime >= a.duration);
      if (atEnd) replayAll();
      else Promise.all(list.map(a => a?.play().catch(() => {})));
    }
  }

  useImperativeHandle(ref, () => ({
    replay: replayAll,
    pause: () => audioRefs.current.forEach(a => a?.pause()),
  }));

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

   return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {clips.map((clip, i) => (
        <audio
          key={i}
          ref={(el) => { audioRefs.current[i] = el; }}
          preload="auto"
          className="hidden"
        />
      ))}

      <div className={`flex items-center gap-3 ${compact ? '' : 'pt-1'}`}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={[
            'rounded-full bg-accent text-bg flex items-center justify-center',
            'hover:bg-accent-2 transition-colors shrink-0',
            compact ? 'w-10 h-10' : 'w-12 h-12',
          ].join(' ')}
        >
          {/* play/pause icon — same as before */}
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>

        <div className="flex-1 flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              audioRefs.current.slice(0, clips.length).forEach(a => {
                if (a) a.currentTime = ratio * duration;
              });
              setCurrentTime(ratio * duration);
            }}
            aria-label="Seek"
            className="relative flex-1 h-2 rounded-full bg-surface-2 overflow-hidden cursor-pointer"
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </button>
          <span className="text-xs text-ink-muted tabular-nums shrink-0 w-20 text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {!compact && (
        <p className="text-xs text-ink-subtle text-center">
          {/* {clips.length}  */}
          Tracks playing together. No solo — listen to the whole mix.
        </p>
      )}
    </div>
  );
});

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}