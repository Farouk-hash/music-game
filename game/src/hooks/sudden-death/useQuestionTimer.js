// game/src/hooks/useQuestionTimer.js
import { useEffect, useRef, useState } from 'react';

/**
 * Countdown timer for sudden-death options mode.
 *
 * - Starts at `seconds` whenever `resetKey` changes.
 * - `paused` freezes the remaining time; unpausing resumes from where it
 *   was (does NOT restart).
 * - Calls `onTimeout()` exactly once per reset cycle.
 * - Exposes `timedOut` — true only after the current cycle has fired.
 *
 * The internal clock is anchored with refs, so reset is atomic and
 * doesn't race with the countdown interval.
 */
export function useQuestionTimer({ seconds, paused, resetKey, onTimeout }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [timedOut, setTimedOut] = useState(false);

  const remainingRef = useRef(seconds);
  const firedRef = useRef(false);
  const anchorRef = useRef(null);
  const anchorValueRef = useRef(seconds);
  const lastResetKeyRef = useRef(resetKey);

  // ── Atomic reset on key change (runs during render) ──
  if (lastResetKeyRef.current !== resetKey) {
    lastResetKeyRef.current = resetKey;
    remainingRef.current = seconds;
    firedRef.current = false;
    anchorRef.current = null;
    anchorValueRef.current = seconds;
    if (timeLeft !== seconds) setTimeLeft(seconds);
    if (timedOut) setTimedOut(false);
  }

  // ── Handle `seconds` changing (rare) ──
  useEffect(() => {
    remainingRef.current = seconds;
    firedRef.current = false;
    anchorRef.current = null;
    anchorValueRef.current = seconds;
    setTimeLeft(seconds);
    setTimedOut(false);
  }, [seconds]);

  // ── Pause / resume + countdown ──
  useEffect(() => {
    if (paused) {
      // Snapshot remaining so a resume picks up here.
      if (anchorRef.current != null) {
        const elapsed = (Date.now() - anchorRef.current) / 1000;
        remainingRef.current = Math.max(0, anchorValueRef.current - elapsed);
        anchorRef.current = null;
        setTimeLeft(remainingRef.current);
      }
      return;
    }

    if (firedRef.current) return;
    if (remainingRef.current <= 0) return;

    anchorValueRef.current = remainingRef.current;
    anchorRef.current = Date.now();

    const id = setInterval(() => {
      const elapsed = (Date.now() - anchorRef.current) / 1000;
      const remaining = Math.max(0, anchorValueRef.current - elapsed);
      remainingRef.current = remaining;
      setTimeLeft(remaining);

      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        setTimedOut(true);
        onTimeout?.();
      }
    }, 200);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, resetKey, seconds]);

  const reset = () => {
    remainingRef.current = seconds;
    firedRef.current = false;
    anchorRef.current = null;
    anchorValueRef.current = seconds;
    setTimeLeft(seconds);
    setTimedOut(false);
  };

  return { timeLeft, timedOut, reset };
}