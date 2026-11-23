// game/src/hooks/sporcle/useHostSporcle.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { sporcleApi } from '@/lib/sporcleApi.js';
import { isNetworkError } from '@/lib/api.js';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';

const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 15000;

/** Resolves when the browser is back online, or when `signal` aborts. */
function waitForOnline(signal) {
  return new Promise((resolve) => {
    if (navigator.onLine || signal.aborted) return resolve();
    const done = () => {
      window.removeEventListener('online', done);
      signal.removeEventListener('abort', done);
      resolve();
    };
    window.addEventListener('online', done);
    signal.addEventListener('abort', done);
  });
}

export function useHostSporcle(code, { enabled = true, playerId = null } = {}) {
  const isOnline = useNetworkStatus();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cancelledRef = useRef(false);
  const sinceRef = useRef(0);
  const stateRef = useRef(null);
  const abortRef = useRef(null);
  const failuresRef = useRef(0);
  // Kept in a ref so a late-arriving identity doesn't restart the poll loop.
  const playerIdRef = useRef(playerId);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

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
    failuresRef.current = 0;
    setLoading(true);
    setError(null);

    // Aborted on unmount so any pending wait (offline / backoff) is released.
    const life = new AbortController();

    async function loop() {
      while (!cancelledRef.current) {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          // playerId makes every poll double as a server-side heartbeat.
          const next = await sporcleApi.state(code, sinceRef.current, {
            signal: controller.signal,
            playerId: playerIdRef.current,
          });
          if (cancelledRef.current) return;

          failuresRef.current = 0;

          if (next?.unchanged) continue;

          if (next?.ok === false) {
            setError(new Error(next.error ?? 'Room error'));
            break;
          }

          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          setState(next);
          sinceRef.current = next.version ?? 0;
          setLoading(false);
          setError(null);
        } catch (e) {
          if (cancelledRef.current) return;
          if (e.name === 'AbortError') continue;

          // Offline: no error state, no retry loop. Keep the last known state,
          // wait for the connection, then resync from scratch (we may have
          // missed any number of versions while away).
          if (isNetworkError(e) && !navigator.onLine) {
            sinceRef.current = 0;
            await waitForOnline(life.signal);
            continue;
          }

          setError(e);
          setLoading(false);

          // Terminal: room is gone. Stop polling so we don't hammer the DO.
          if (e.status === 404) break;

          // Transient (server unreachable, 5xx): exponential backoff.
          failuresRef.current += 1;
          const delay = Math.min(
            BACKOFF_BASE_MS * 2 ** (failuresRef.current - 1),
            BACKOFF_MAX_MS
          );
          await new Promise(r => setTimeout(r, delay));
        } finally {
          abortRef.current = null;
        }
      }
    }

    loop();

    function onVisibility() {
      if (document.visibilityState === 'visible') refresh();
    }
    // A long-poll can hang for a long time after the network drops: abort it so
    // the loop moves straight to "waiting for the connection".
    function onOffline() {
      abortRef.current?.abort();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelledRef.current = true;
      life.abort();
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('offline', onOffline);
    };
  }, [code, enabled, refresh]);

  return { state, loading, error, refresh, applyOptimistic, isOffline: !isOnline };
}