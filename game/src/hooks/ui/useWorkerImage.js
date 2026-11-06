// game/src/hooks/ui/useWorkerImage.js
//
// React wrapper around lib/workerUrl.js + useImageLoader.
// Accepts either a relative path (string) or a cover-shaped object,
// resolves it to an absolute Worker URL, and reports load state.

import { useMemo } from 'react';
import { useImageLoader } from '../common/useImageLoader';
import { absoluteWorkerUrl, resolveCoverUrl } from '../../lib/workerUrl.js';

export function useWorkerImage(input) {
  const src = useMemo(() => {
    if (!input) return null;
    if (typeof input === 'object' && 'kind' in input) {
      return resolveCoverUrl(input);
    }
    if (typeof input === 'string') {
      return absoluteWorkerUrl(input);
    }
    return null;
  }, [input]);

  const { status, isLoading, isLoaded, isError } = useImageLoader(src);
  return { src, status, isLoading, isLoaded, isError };
}