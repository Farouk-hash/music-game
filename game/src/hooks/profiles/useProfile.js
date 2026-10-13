// game/src/hooks/profile/useProfile.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../../lib/profileApi.js';
import {
  getProfileId,
  setProfileId,
  getRecoveryCode,
  setPendingRecoveryCode,
  dismissRecoveryCode,
  showRecoveryCode,
  getCachedProfile,
  setCachedProfile,
  clearCachedProfile,
} from './profileStorage.js';

const EMPTY_FAVORITES = Object.freeze({
  artists: [],
  genres: [],
  tracks: [],
  questionTypes: [],
});

function shortSuffix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 3; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ─────────────────────────────────────────────────────────────
   Module-level in-flight promise for profile creation.
   ───────────────────────────────────────────────────────────── */

let creatingPromise = null;

function ensureProfileCreated() {
  if (creatingPromise) return creatingPromise;

  creatingPromise = (async () => {
    try {
      const r = await profileApi.create({
        nickname: `Player-${shortSuffix()}`,
      });
      setProfileId(r.profile.id);
      setPendingRecoveryCode(r.recoveryCode);
      setCachedProfile(r.profile.id, r.profile);
      return r.profile.id;
    } finally {
      creatingPromise = null;
    }
  })();

  return creatingPromise;
}

/* ─────────────────────────────────────────────────────────────
   Internal hook — id + recovery state
   ───────────────────────────────────────────────────────────── */

function useEnsureProfile() {
  const [id, setId] = useState(() => getProfileId());
  const [bootError, setBootError] = useState(null);

  const [recoveryCode, setRecoveryCodeState] = useState(() => getRecoveryCode());
  const [recoveryHidden, setRecoveryHidden] = useState(() => {
    try {
      return localStorage.getItem('music-game:profile:recoveryHidden') === '1';
    } catch { return false; }
  });

  useEffect(() => {
    if (id) return;
    let cancelled = false;

    ensureProfileCreated()
      .then((newId) => {
        if (cancelled) return;
        setId(newId);
        setRecoveryCodeState(getRecoveryCode());
        setRecoveryHidden(false);
      })
      .catch((e) => {
        if (!cancelled) setBootError(e);
      });

    return () => { cancelled = true; };
  }, [id]);

  return {
    id, setId, bootError,
    recoveryCode, setRecoveryCodeState,
    recoveryHidden, setRecoveryHidden,
  };
}

/* ─────────────────────────────────────────────────────────────
   Public hook
   ───────────────────────────────────────────────────────────── */

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    id, setId, bootError,
    recoveryCode, setRecoveryCodeState,
    recoveryHidden, setRecoveryHidden,
  } = useEnsureProfile();

  const query = useQuery({
    queryKey: ['profile', id],
    queryFn: () => profileApi.get(id),
    enabled: !!id,

    // Never consider the profile stale on its own. It only refetches
    // when we explicitly invalidate after a mutation.
    staleTime: Infinity,
    gcTime: Infinity,

    // Even if it were stale, don't refetch on mount / focus / reconnect.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    // Hydrate from localStorage so the profile renders instantly on
    // a page refresh — no network round-trip needed.
    initialData: () => {
      const cached = getCachedProfile(id);
      if (!cached) return undefined;
      return { profile: cached };
    },
  });

  const profile = query.data?.profile ?? null;
  const isLoading = !id || (query.isLoading && !profile);
  const queryError = query.error;
  const refetch = query.refetch;

  const favorites = profile?.favorites ?? EMPTY_FAVORITES;

  /* ── Cache writers ──────────────────────────────────────── */

  const writeProfileToCache = useCallback((nextProfile) => {
    if (!id || !nextProfile) return;
    queryClient.setQueryData(['profile', id], { profile: nextProfile });
    setCachedProfile(id, nextProfile);
  }, [id, queryClient]);

  useEffect(() => {
    if (id && profile) setCachedProfile(id, profile);
  }, [id, profile]);

  /* ── Mutations ──────────────────────────────────────────── */

  const updateNickname = useCallback(async (nickname) => {
    const r = await profileApi.patch(id, { nickname });
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const updateAvatarStyle = useCallback(async (style, seed) => {
    const r = await profileApi.patch(id, { avatar_style: style, avatar_seed: seed });
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const uploadAvatar = useCallback(async (file) => {
    const r = await profileApi.uploadAvatar(id, file);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const removeUploadedAvatar = useCallback(async () => {
    const r = await profileApi.deleteAvatar(id);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const save = useCallback(async (payload) => {
    const r = await profileApi.save(id, payload);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const addFavorite = useCallback(async (kind, value) => {
    const r = await profileApi.addFavorite(id, kind, value);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const removeFavorite = useCallback(async (kind, value) => {
    const r = await profileApi.removeFavorite(id, kind, value);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const clearUploadedAvatarAndKind = useCallback(async () => {
    const r = await profileApi.deleteAvatar(id);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  /**
   * Restore from a recovery code.
   *
   * The recovered profile is NOT cached on this device, so we clear
   * the cache and invalidate to force a fresh fetch.
   */
  const recoverProfile = useCallback(async (code) => {
    const r = await profileApi.recover({ recoveryCode: code });

    setProfileId(r.id);
    setId(r.id);

    try {
      localStorage.removeItem('music-game:profile:recoveryCode');
      localStorage.removeItem('music-game:profile:recoveryHidden');
    } catch {}
    setRecoveryCodeState(null);
    setRecoveryHidden(false);

    clearCachedProfile();
    queryClient.removeQueries({ queryKey: ['profile'] });
    return r.id;
  }, [setId, setRecoveryCodeState, setRecoveryHidden, queryClient]);

  /* ── Recovery code visibility ──────────────────────────── */

  const dismissRecovery = useCallback(() => {
    dismissRecoveryCode();
    setRecoveryHidden(true);
  }, [setRecoveryHidden]);

  const showRecovery = useCallback(() => {
    showRecoveryCode();
    setRecoveryHidden(false);
  }, [setRecoveryHidden]);

  const pendingRecoveryCode = !recoveryHidden ? recoveryCode : null;
  const hasRecoveryCode = !!recoveryCode;

  /* ── Memoized context value ────────────────────────────── */

  const value = useMemo(() => ({
    id,
    profile,
    favorites,
    isLoading,
    error: bootError ?? queryError,

    updateNickname,
    updateAvatarStyle,
    uploadAvatar,
    removeUploadedAvatar,
    clearUploadedAvatarAndKind,
    save,
    addFavorite,
    removeFavorite,
    recoverProfile,

    pendingRecoveryCode,
    hasRecoveryCode,
    dismissRecovery,
    showRecovery,

    refetch,
  }), [
    id,
    profile,
    favorites,
    isLoading,
    bootError,
    queryError,

    updateNickname,
    updateAvatarStyle,
    uploadAvatar,
    removeUploadedAvatar,
    clearUploadedAvatarAndKind,
    save,
    addFavorite,
    removeFavorite,
    recoverProfile,

    pendingRecoveryCode,
    hasRecoveryCode,
    dismissRecovery,
    showRecovery,

    refetch,
  ]);

  return value;
}