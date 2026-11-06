// game/src/components/ui/Image.jsx
import { useState } from 'react';
import { Skeleton } from './Skeleton.jsx';

export function Image({
  src,
  alt = '',
  className = '',
  wrapperClass = '',
  fallbackLetter,
  fallback,
  fadeDuration = 250,
  loading = 'lazy',
  ...rest
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'idle');

  const showSkeleton = status === 'loading' && !!src;
  const showImage    = status === 'loaded' && !!src;
  const showFallback = !src || status === 'error';

  return (
    <div className={`relative overflow-hidden ${wrapperClass}`}>
      {/* Skeleton while loading */}
      {showSkeleton && (
        <Skeleton
          className="absolute inset-0 w-full h-full"
          rounded="none"
        />
      )}

      {/* Fallback (no src, or load failed) */}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
          {fallback ?? (
            <span className="text-5xl font-extrabold text-accent/60 select-none">
              {fallbackLetter ?? '?'}
            </span>
          )}
        </div>
      )}

      {/* The actual image, hidden until loaded */}
      {src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={[
            className,
            'transition-opacity',
            showImage ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          style={{ transitionDuration: `${fadeDuration}ms` }}
          {...rest}
        />
      )}
    </div>
  );
}