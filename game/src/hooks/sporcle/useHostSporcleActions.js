// game/src/hooks/sporcle/useHostSporcleActions.js
import { useCallback, useState } from 'react';
import { sporcleApi } from '../../lib/sporcleApi.js';

/**
 * Thin wrappers around POST /action.
 *
 * Each action returns `{ ok, version, ... }` on success and throws on
 * failure. The caller decides whether to apply an optimistic state
 * update or wait for the next poll.
 *
 * `onVersion(version)` — invoked after every successful action so the
 * polling hook can advance `since`. Useful for skipping a redundant
 * state fetch.
 */
export function useHostSporcleActions(code, { onVersion } = {}) {
  const [pending, setPending] = useState(null); // action type in flight
  const [error, setError] = useState(null);

  const run = useCallback(async (type, body) => {
      setPending(type);
      setError(null);
      try {
        const result = await sporcleApi.action(code, { type, ...body });
        if (result?.ok === false) throw new Error(result.error ?? 'Action failed');
        if (onVersion && typeof result.version === 'number') onVersion(result.version);
        return result;
      } catch (e) {
        console.error('[action failed]', {
          type,
          playerId: body.playerId,
          error: e.message,
          body: e.body,
        });
        setError(e);
        throw e;
      } finally {
        setPending(null);
      }
    }, [code, onVersion]);
    
  return {
    pending,
    error,

    ready:   (playerId, ready) => run('ready', { playerId, ready }),
    start:   (playerId)        => run('start', { playerId }),
    answer:  (playerId, typed) => run('answer', { playerId, typed }),
    advance: (playerId)        => run('advance', { playerId }),
    leave:   (playerId)        => run('leave', { playerId }),
    reset:   (playerId)        => run('reset', { playerId }),
    rejoin:  (playerId)        => run('rejoin', { playerId }),
  };
}