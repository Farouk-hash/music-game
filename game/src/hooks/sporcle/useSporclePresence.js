// game/src/hooks/sporcle/useSporclePresence.js
//
// Presence for a player on a room screen (Play / Result).
//
//  1. INSTANT leave  – beacon on tab close / page hide  → server left = 1
//  2. FALLBACK       – heartbeat ping every 10s         → if the beacon never
//                      arrives, the server times the player out (left = 2)
//  3. COMEBACK       – a reload / bfcache restore / network return rejoins
//                      automatically unless the leave was deliberate
//
// The beacon must NOT fire on React unmount (in-app navigation Play → Result
// must not mark anyone as left), so it only listens to real page events.
//
// Offline: pings are skipped (nothing is sent). On reconnect a ping goes out
// immediately, and if the server already marked us as left, we rejoin.

import { useCallback, useEffect, useRef } from 'react';
import { sporcleApi, leaveBeaconRaw } from '@/lib/sporcleApi.js';

const PING_INTERVAL_MS = 10000;

/**
 * @param {string}  code
 * @param {string|null} myId
 * @param {object}  opts
 * @param {boolean} opts.meLeft         – server says this player is marked left
 * @param {boolean} opts.beaconEnabled  – set false to disable the tab-close beacon (default true)
 * @param {Function} opts.onRejoined    – called after a successful rejoin (e.g. refresh)
 * @returns {{ markIntentionalLeave: () => void }}
 */
export function useSporclePresence(
  code,
  myId,
  { meLeft = false, beaconEnabled = true, onRejoined } = {}
) {
  const intentionalRef = useRef(false);   // user clicked a leave button
  const beaconSentRef = useRef(false);    // beacon fired in this page lifetime
  const rejoinTriedRef = useRef(false);
  const beaconEnabledRef = useRef(beaconEnabled);
  const onRejoinedRef = useRef(onRejoined);
  const meLeftRef = useRef(meLeft);

  useEffect(() => { beaconEnabledRef.current = beaconEnabled; }, [beaconEnabled]);
  useEffect(() => { onRejoinedRef.current = onRejoined; }, [onRejoined]);
  useEffect(() => { meLeftRef.current = meLeft; }, [meLeft]);

  const rejoin = useCallback(() => {
    if (!code || !myId) return;
    sporcleApi
      .action(code, { type: 'rejoin', playerId: myId })
      .then(() => onRejoinedRef.current?.())
      .catch(() => {
        // Allow another attempt (e.g. when the connection returns).
        rejoinTriedRef.current = false;
      });
  }, [code, myId]);

  /* 1 ── Instant leave on real page teardown + bfcache restore */
  useEffect(() => {
    if (!code || !myId) return;

    function fireLeave() {
      if (!beaconEnabledRef.current) return;
      if (intentionalRef.current || beaconSentRef.current) return;
      beaconSentRef.current = true;
      leaveBeaconRaw(code, myId);
    }

    function onPageShow(e) {
      // Page restored from the back/forward cache after we fired the beacon.
      if (e.persisted && beaconSentRef.current && !intentionalRef.current) {
        beaconSentRef.current = false;
        rejoin();
      }
    }

    // pagehide can fire without the page really dying (app switch, tab freeze).
    // If we become visible again, the page is alive: cancel the "I left" state.
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (beaconSentRef.current && !intentionalRef.current) {
        beaconSentRef.current = false;
        rejoin();
      }
    }

    window.addEventListener('beforeunload', fireLeave);
    window.addEventListener('pagehide', fireLeave);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('beforeunload', fireLeave);
      window.removeEventListener('pagehide', fireLeave);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [code, myId, rejoin]);

  /* 2 ── Heartbeat (independent of the poll loop) */
  useEffect(() => {
    if (!code || !myId) return;

    const send = () => {
      if (intentionalRef.current || beaconSentRef.current) return;
      if (!navigator.onLine) return; // offline: nothing to send
      sporcleApi.ping(code, myId).catch(() => {});
    };

    send();
    const t = setInterval(send, PING_INTERVAL_MS);

    // Mobile browsers throttle timers while hidden – ping as soon as we're back.
    function onVisible() {
      if (document.visibilityState === 'visible') send();
    }
    // Connection returned: tell the server we're alive right away instead of
    // waiting up to PING_INTERVAL_MS (the server may be about to time us out).
    function onOnline() {
      send();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [code, myId]);

  /* 3 ── Rejoin when the server shows us as left but we didn't mean to.
          Covers: page reload (beacon set left = 1), network return (left = 2). */
  useEffect(() => {
    if (!meLeft) {
      rejoinTriedRef.current = false;
      return;
    }
    if (intentionalRef.current || beaconSentRef.current) return;
    if (rejoinTriedRef.current) return;
    rejoinTriedRef.current = true;
    rejoin();
  }, [meLeft, rejoin]);

  /* 3b ── A rejoin that failed (e.g. still offline) is retried on reconnect. */
  useEffect(() => {
    function onOnline() {
      if (!meLeftRef.current) return;
      if (intentionalRef.current || beaconSentRef.current) return;
      rejoin();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [rejoin]);

  const markIntentionalLeave = useCallback(() => {
    intentionalRef.current = true;
  }, []);

  return { markIntentionalLeave };
}