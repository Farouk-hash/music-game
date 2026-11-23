// game/src/hooks/profiles/useProfile.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/lib/profileApi.js';
import { isNetworkError, offlineError } from '@/lib/api.js';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';
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

const BOOT_RETRY_MS = 5000;

function shortSuffix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 3; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Every write needs the server. Fail fast with an identifiable offline error
// instead of letting the request (or an upload) start and hang.
function assertOnline() {
  if (!navigator.onLine) throw offlineError();
}

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

function useEnsureProfile() {
  const online = useNetworkStatus();
  const [id, setId] = useState(() => getProfileId());
  const [bootError, setBootError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const [recoveryCode, setRecoveryCodeState] = useState(() => getRecoveryCode());
  const [recoveryHidden, setRecoveryHidden] = useState(() => {
    try {
      return localStorage.getItem('music-game:profile:recoveryHidden') === '1';
    } catch { return false; }
  });

  useEffect(() => {
    // Already have a profile, or offline: do nothing. When the connection
    // returns, `online` changes and this effect runs again.
    if (id || !online) return;

    let cancelled = false;
    let timer = null;
    setBootError(null);

    ensureProfileCreated()
      .then((newId) => {
        if (cancelled) return;
        setId(newId);
        setRecoveryCodeState(getRecoveryCode());
        setRecoveryHidden(false);
      })
      .catch((e) => {
        if (cancelled) return;
        if (isNetworkError(e)) {
          // Server unreachable while the browser says "online": retry later
          // without surfacing an error.
          timer = setTimeout(() => {
            if (!cancelled) setAttempt((n) => n + 1);
          }, BOOT_RETRY_MS);
        } else {
          setBootError(e);
        }
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, online, attempt]);

  return {
    id, setId, bootError,
    recoveryCode, setRecoveryCodeState,
    recoveryHidden, setRecoveryHidden,
    needsConnection: !id && !online,
  };
}

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    id, setId, bootError,
    recoveryCode, setRecoveryCodeState,
    recoveryHidden, setRecoveryHidden,
    needsConnection,
  } = useEnsureProfile();

  const query = useQuery({
    queryKey: ['profile', id],
    queryFn: () => profileApi.get(id),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: () => {
      const cached = getCachedProfile(id);
      if (!cached) return undefined;
      return { profile: cached };
    },
  });

  const profile = query.data?.profile ?? null;
  // First visit while offline: there is nothing to wait for, so don't spin forever.
  const isLoading = needsConnection ? false : (!id || (query.isLoading && !profile));
  const queryError = query.error;
  const refetch = query.refetch;

  const favorites = profile?.favorites ?? EMPTY_FAVORITES;

  const writeProfileToCache = useCallback((nextProfile) => {
    if (!id || !nextProfile) return;
    queryClient.setQueryData(['profile', id], { profile: nextProfile });
    setCachedProfile(id, nextProfile);
  }, [id, queryClient]);

  useEffect(() => {
    if (id && profile) setCachedProfile(id, profile);
  }, [id, profile]);

  const updateNickname = useCallback(async (nickname) => {
    assertOnline();
    const r = await profileApi.patch(id, { nickname });
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const updateAvatarStyle = useCallback(async (style, seed) => {
    assertOnline();
    const r = await profileApi.patch(id, { avatar_style: style, avatar_seed: seed });
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const uploadAvatar = useCallback(async (file) => {
    assertOnline();
    const r = await profileApi.uploadAvatar(id, file);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const removeUploadedAvatar = useCallback(async () => {
    assertOnline();
    const r = await profileApi.deleteAvatar(id);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const save = useCallback(async (payload) => {
    assertOnline();
    const r = await profileApi.save(id, payload);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const addFavorite = useCallback(async (kind, value) => {
    assertOnline();
    const r = await profileApi.addFavorite(id, kind, value);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const removeFavorite = useCallback(async (kind, value) => {
    assertOnline();
    const r = await profileApi.removeFavorite(id, kind, value);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const clearUploadedAvatarAndKind = useCallback(async () => {
    assertOnline();
    const r = await profileApi.deleteAvatar(id);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const updateContacts = useCallback(async ({ email, phone }) => {
    assertOnline();
    const patch = {};
    if (email !== undefined) patch.email = email;
    if (phone !== undefined) patch.phone = phone;
    const r = await profileApi.patch(id, patch);
    if (r?.profile) writeProfileToCache(r.profile);
  }, [id, writeProfileToCache]);

  const recoverProfile = useCallback(async ({ recoveryCode, email, phone }) => {
    assertOnline(); // must happen BEFORE any local state is touched
    const oldId = getProfileId();

    const r = await profileApi.recover({ recoveryCode, email, phone });

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

    if (oldId && oldId !== r.id) {
      try {
        await profileApi.deleteProfile(oldId);
      } catch (e) {
        console.warn('[recoverProfile] failed to delete old profile', oldId, e);
      }
    }

    return r.id;
  }, [setId, setRecoveryCodeState, setRecoveryHidden, queryClient]);

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

  const value = useMemo(() => ({
    id,
    profile,
    favorites,
    isLoading,
    needsConnection,
    error: bootError ?? queryError,

    updateNickname,
    updateAvatarStyle,
    uploadAvatar,
    removeUploadedAvatar,
    clearUploadedAvatarAndKind,
    save,
    addFavorite,
    removeFavorite,
    updateContacts,
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
    needsConnection,
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
    updateContacts,
    recoverProfile,

    pendingRecoveryCode,
    hasRecoveryCode,
    dismissRecovery,
    showRecovery,

    refetch,
  ]);

  return value;
}