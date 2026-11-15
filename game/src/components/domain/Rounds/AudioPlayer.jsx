// game/src/components/game/AudioPlayer.jsx
import {
  useEffect, useRef, useState, forwardRef, useImperativeHandle,
} from 'react';

export const AudioPlayer = forwardRef(function AudioPlayer(
  { src, autoPlay = true, loop = true, stopOnReveal = false, revealed = false },
  ref
) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useImperativeHandle(ref, () => ({
    replay() {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => {});
    },
    pause() {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
    },
  }));

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !src) return;

    a.src = src;
    a.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);

    if (autoPlay) {
      a.play().catch(() => {});
    }
  }, [src, autoPlay]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay    = () => setIsPlaying(true);
    const onPause   = () => setIsPlaying(false);
    const onTime    = () => setCurrentTime(a.currentTime);
    const onMeta    = () => setDuration(a.duration || 0);
    const onEnded   = () => setIsPlaying(false);

    a.addEventListener('play',         onPlay);
    a.addEventListener('pause',        onPause);
    a.addEventListener('timeupdate',   onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended',        onEnded);

    return () => {
      a.removeEventListener('play',         onPlay);
      a.removeEventListener('pause',        onPause);
      a.removeEventListener('timeupdate',   onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended',        onEnded);
    };
  }, []);

  useEffect(() => {
    if (stopOnReveal && revealed) {
      const a = audioRef.current;
      if (a) a.pause();
    }
  }, [stopOnReveal, revealed]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  function handleSeek(e) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrentTime(a.currentTime);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex items-center gap-3">
      <audio ref={audioRef} preload="auto" loop={loop} className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-12 h-12 rounded-full bg-accent text-bg flex items-center justify-center hover:bg-accent-2 transition-colors shrink-0"
      >
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

      <div className="flex-1 min-w-0 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSeek}
          aria-label="Seek"
          className="relative flex-1 h-2 rounded-full bg-surface-2 overflow-hidden cursor-pointer"
        >
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </button>
        
        {/* HIDDEN ON MOBILE, VISIBLE ON DESKTOP */}
        <span className="hidden sm:block text-xs text-ink-muted tabular-nums shrink-0 whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
});

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}