import { useState, useEffect } from 'react';

/**
 * Tracks the load state of an image URL.
 *
 *   const { status, isLoaded, isError } = useImageLoader(src);
 *   // status: 'idle' | 'loading' | 'loaded' | 'error'
 *
 * A module-level cache remembers URLs that have already been loaded in
 * this session, so re-rendering the same image (e.g. when a filter
 * changes) doesn't flash the skeleton.
 */

const loadedCache = new Set();
const errorCache  = new Set();

export function useImageLoader(src) {
  const [status, setStatus] = useState(() => {
    if (!src) return 'idle';
    if (loadedCache.has(src)) return 'loaded';
    if (errorCache.has(src))  return 'error';
    return 'loading';
  });

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }
    if (loadedCache.has(src)) {
      setStatus('loaded');
      return;
    }
    if (errorCache.has(src)) {
      setStatus('error');
      return;
    }

    // Check the browser's own image cache first — if the image is
    // already decoded, we can skip straight to loaded.
    let cancelled = false;
    const probe = new window.Image();

    probe.onload = () => {
      if (cancelled) return;
      loadedCache.add(src);
      setStatus('loaded');
    };
    probe.onerror = () => {
      if (cancelled) return;
      errorCache.add(src);
      setStatus('error');
    };
    probe.src = src;

    setStatus('loading');

    return () => {
      cancelled = true;
    };
  }, [src]);

  return {
    status,
    isLoading: status === 'loading',
    isLoaded:  status === 'loaded',
    isError:   status === 'error',
  };
}