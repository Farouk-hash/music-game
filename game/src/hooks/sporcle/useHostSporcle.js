// game/src/hooks/sporcle/useHostSporcle.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { sporcleApi } from '../../lib/sporcleApi.js';

export function useHostSporcle(code, { enabled = true } = {}) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cancelledRef = useRef(false);
  const sinceRef = useRef(0);
  const stateRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const refresh = useCallback(() => {
    sinceRef.current = 0;
    abortRef.current?.abort();
  }, []);

  const applyOptimistic = useCallback((updater) => {
    setState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      if (next && typeof next.version === 'number') {
        sinceRef.current = Math.max(sinceRef.current, next.version);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!code || !enabled) return;

    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    async function loop() {
      while (!cancelledRef.current) {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const next = await sporcleApi.state(code, sinceRef.current, {
            signal: controller.signal,
          });
          if (cancelledRef.current) return;

          if (next?.unchanged) continue;

          if (next?.ok === false) {
            setError(new Error(next.error ?? 'Room error'));
            break;
          }

          setState(next);
          sinceRef.current = next.version ?? 0;
          setLoading(false);
          setError(null);
        } catch (e) {
          if (cancelledRef.current) return;
          if (e.name === 'AbortError') continue;

          setError(e);
          setLoading(false);

          // Terminal: room is gone. Stop polling so we don't hammer the DO.
          if (e.status === 404) break;

          // Transient: backoff and retry.
          await new Promise(r => setTimeout(r, 2000));
        } finally {
          abortRef.current = null;
        }
      }
    }

    loop();

    function onVisibility() {
      if (document.visibilityState === 'visible') refresh();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [code, enabled, refresh]);

  return { state, loading, error, refresh, applyOptimistic };
}