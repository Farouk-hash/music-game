// game/src/hooks/useHostSporcleIdentity.js
import { useCallback, useEffect, useState } from 'react';

export function useHostSporcleIdentity(code) {
  const normalizedCode = (code ?? '').toUpperCase();

  const playerIdKey = normalizedCode ? `sporcle:${normalizedCode}:playerId` : null;
  const nameKey     = normalizedCode ? `sporcle:${normalizedCode}:name`     : null;

  const [identity, setIdentity] = useState(() => {
    if (!playerIdKey) return null;
    const playerId = localStorage.getItem(playerIdKey);
    const name = localStorage.getItem(nameKey);
    if (!playerId) return null;
    return { playerId, name: name ?? '' };
  });

  // Re-read when the code changes.
  useEffect(() => {
    if (!playerIdKey) { setIdentity(null); return; }
    const playerId = localStorage.getItem(playerIdKey);
    const name = localStorage.getItem(nameKey);
    setIdentity(playerId ? { playerId, name: name ?? '' } : null);
  }, [playerIdKey, nameKey]);

  // Cross-tab: another tab writes the identity → update this tab.
  useEffect(() => {
    if (!playerIdKey) return;
    function onStorage(e) {
      if (e.key !== playerIdKey && e.key !== nameKey) return;
      const playerId = localStorage.getItem(playerIdKey);
      const name = localStorage.getItem(nameKey);
      setIdentity(playerId ? { playerId, name: name ?? '' } : null);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [playerIdKey, nameKey]);

  const save = useCallback((nextPlayerId, nextName) => {
    if (!playerIdKey) return;
    localStorage.setItem(playerIdKey, nextPlayerId);
    localStorage.setItem(nameKey, nextName);
    setIdentity({ playerId: nextPlayerId, name: nextName });
  }, [playerIdKey, nameKey]);

  const clear = useCallback(() => {
    if (!playerIdKey) return;
    localStorage.removeItem(playerIdKey);
    localStorage.removeItem(nameKey);
    setIdentity(null);
  }, [playerIdKey, nameKey]);

  const saveForCode = useCallback((targetCode, nextPlayerId, nextName) => {
    const c = (targetCode ?? '').toUpperCase();
    if (!c) return;
    localStorage.setItem(`sporcle:${c}:playerId`, nextPlayerId);
    localStorage.setItem(`sporcle:${c}:name`, nextName);
    if (c === normalizedCode) {
      setIdentity({ playerId: nextPlayerId, name: nextName });
    }
  }, [normalizedCode]);

  return { identity, save, saveForCode, clear };
}