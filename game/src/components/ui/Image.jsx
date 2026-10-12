// game/src/components/ui/Image.jsx
import { useImageLoader } from '../../hooks/common/useImageLoader.js';
import { Skeleton } from './Skeleton.jsx';

/**
 * Image with built-in loading skeleton and error fallback.
 *
 *   <Image src={url} alt="Artist" className="w-full h-full object-cover" />
 *   <Image src={url} fallbackLetter="A" className="..." />
 *   <Image src={url} fallback={<CustomThing />} className="..." />
 *
 * Props:
 *   src           — image URL
 *   alt           — alt text (defaults to '')
 *   className     — applied to the <img> element
 *   wrapperClass  — applied to the outer container
 *   fallbackLetter — single letter shown if no image / error (optional)
 *   fallback      — custom React node shown on error (overrides fallbackLetter)
 *   fadeDuration  — transition duration in ms (default 250)
 *   loading       — native loading attribute (default 'lazy')
 */
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
  const { status } = useImageLoader(src);

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