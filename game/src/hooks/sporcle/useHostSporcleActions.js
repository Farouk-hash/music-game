// game/src/hooks/sporcle/useHostSporcleActions.js
import { useCallback, useState } from 'react';
import { sporcleApi } from '../../lib/sporcleApi.js';

export function useHostSporcleActions(code, { onVersion } = {}) {
  const [pending, setPending] = useState(null);
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

    ready:        (playerId, ready) => run('ready',        { playerId, ready }),
    start:        (playerId)        => run('start',        { playerId }),
    answer:       (playerId, typed) => run('answer',       { playerId, typed }),
    advance:      (playerId)        => run('advance',      { playerId }),
    leave:        (playerId)        => run('leave',        { playerId }),
    reset:        (playerId)        => run('reset',        { playerId }),
    rejoin:       (playerId)        => run('rejoin',       { playerId }),
    chat:         (playerId, text)  => run('chat',         { playerId, text }),
    startAgain:   (playerId, config)=> run('start_again',  { playerId, config }),
    forceClose:   (playerId)        => run('force_close',  { playerId }),
  };
}