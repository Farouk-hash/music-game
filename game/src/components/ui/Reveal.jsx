// game/src/components/ui/Reveal.jsx
import { useEffect, useRef, useState } from 'react';

export function Reveal({
  children,
  direction = 'auto',
  delay = 0,
  duration = 1200,    // <-- Slower (was 800)
  distance = 100,     // <-- Travels further (was 48)
  blur = 8,           // <-- More blur (was 6)
  scale = 0.96,       // <-- Subtle scale
  repeat = true,
  rootMargin = '-5% 0px -10% 0px',
  className = '',
}) {
  const ref = useRef(null);
  const [state, setState] = useState('below');

  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('visible');
          if (!repeat) observer.unobserve(el);
        } else if (repeat) {
          const rootTop = entry.rootBounds?.top ?? 0;
          setState(entry.boundingClientRect.top < rootTop ? 'above' : 'below');
        }
      },
      { rootMargin, threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [repeat, rootMargin]);

  const hidden = state !== 'visible';
  const side = state === 'above' ? 'above' : 'below';

  // Smooth ease-out on the way in, quicker ease-in on the way out
  const easeIn = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const easeOut = 'cubic-bezier(0.4, 0, 1, 1)';
  const outMs = Math.round(duration * 0.6); // <-- Slower exit (was 0.5)

  const transition = hidden
    ? `opacity ${outMs}ms ${easeOut}, transform ${outMs}ms ${easeOut}, filter ${outMs}ms ${easeOut}`
    : `opacity ${duration}ms ${easeIn} ${delay}ms, transform ${duration}ms ${easeIn} ${delay}ms, filter ${duration}ms ${easeIn} ${delay}ms`;

  let transformValue = 'none';
  if (hidden && !reduced) {
    const s = scale !== 1 ? ` scale(${scale})` : '';
    switch (direction) {
      case 'auto':
        transformValue = `translateY(${side === 'below' ? distance : -distance}px)${s}`;
        break;
      case 'up':
        transformValue = `translateY(${distance}px)${s}`;
        break;
      case 'down':
        transformValue = `translateY(-${distance}px)${s}`;
        break;
      case 'left':
        transformValue = `translateX(${distance}px)${s}`;
        break;
      case 'right':
        transformValue = `translateX(-${distance}px)${s}`;
        break;
      case 'none':
      default:
        transformValue = s ? s.trim() : 'none';
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: transformValue,
        filter: hidden && !reduced && blur > 0 ? `blur(${blur}px)` : 'none',
        transition,
        willChange: hidden ? 'opacity, transform, filter' : 'auto',
      }}
    >
      {children}
    </div>
  );
}