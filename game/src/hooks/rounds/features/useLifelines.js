// game/src/hooks/rounds/useLifelines.js
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'game.lifelines';

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function save(state) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function clear() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export function useLifelines(initial, count) {
  const key = `${initial.skips}:${initial.removes}:${initial.reveals}:${count}`;

  const [state, setState] = useState(() => {
    const saved = load();
    // If the saved key matches the current config, resume it
    if (saved && saved.key === key) {
      return saved;
    }
    // Otherwise, start fresh with the new config
    return {
      key,
      skipsLeft:   initial.skips,
      removesLeft: initial.removes,
      revealsLeft: initial.reveals,
    };
  });

  // If the config changes (e.g. clicking Play again with new params),
  // force a reset.
  useEffect(() => {
    setState(prev => {
      if (prev.key !== key) {
        return {
          key,
          skipsLeft:   initial.skips,
          removesLeft: initial.removes,
          revealsLeft: initial.reveals,
        };
      }
      return prev;
    });
  }, [key, initial.skips, initial.removes, initial.reveals]);

  useEffect(() => { save(state); }, [state]);

  const allZero =
    state.skipsLeft === 0 && state.removesLeft === 0 && state.revealsLeft === 0 &&
    initial.skips === 0 && initial.removes === 0 && initial.reveals === 0;

  const canSkip   = state.skipsLeft > 0;
  const canRemove = state.removesLeft > 0;
  const canReveal = state.revealsLeft > 0;

  const useSkip = useCallback(() => {
    setState(s => s.skipsLeft > 0 ? { ...s, skipsLeft: s.skipsLeft - 1 } : s);
  }, []);
  const useRemove = useCallback(() => {
    setState(s => s.removesLeft > 0 ? { ...s, removesLeft: s.removesLeft - 1 } : s);
  }, []);
  const useReveal = useCallback(() => {
    setState(s => s.revealsLeft > 0 ? { ...s, revealsLeft: s.revealsLeft - 1 } : s);
  }, []);

  const reset = useCallback(() => {
    clear();
    setState({
      key,
      skipsLeft: initial.skips,
      removesLeft: initial.removes,
      revealsLeft: initial.reveals,
    });
  }, [key, initial.skips, initial.removes, initial.reveals]);

  return {
    skipsLeft: state.skipsLeft,
    removesLeft: state.removesLeft,
    revealsLeft: state.revealsLeft,
    canSkip, canRemove, canReveal,
    allZero,
    useSkip, useRemove, useReveal,
    reset,
  };
}