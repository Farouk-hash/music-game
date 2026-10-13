// game/src/hooks/profile/profileStorage.js
//
// Small helper module: reads/writes the profile id, recovery code,
// hidden flag, and a local cache of the full profile.

const K_ID              = 'music-game:profile:id';
const K_RECOVERY        = 'music-game:profile:recoveryCode';
const K_RECOVERY_HIDDEN = 'music-game:profile:recoveryHidden';
const K_CACHE           = 'music-game:profile:cache';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days

/* ── Profile id ─────────────────────────────────────────── */

export function getProfileId() {
  try { return localStorage.getItem(K_ID); } catch { return null; }
}

export function setProfileId(id) {
  try { localStorage.setItem(K_ID, id); } catch {}
}

export function clearProfileId() {
  try {
    localStorage.removeItem(K_ID);
    localStorage.removeItem(K_RECOVERY);
    localStorage.removeItem(K_RECOVERY_HIDDEN);
    localStorage.removeItem(K_CACHE);
  } catch {}
}

/* ── Recovery code ──────────────────────────────────────── */

export function getPendingRecoveryCode() {
  try {
    if (localStorage.getItem(K_RECOVERY_HIDDEN) === '1') return null;
    return localStorage.getItem(K_RECOVERY);
  } catch { return null; }
}

export function getRecoveryCode() {
  try { return localStorage.getItem(K_RECOVERY); } catch { return null; }
}

export function setPendingRecoveryCode(code) {
  try {
    localStorage.setItem(K_RECOVERY, code);
    localStorage.removeItem(K_RECOVERY_HIDDEN);
  } catch {}
}

export function dismissRecoveryCode() {
  try { localStorage.setItem(K_RECOVERY_HIDDEN, '1'); } catch {}
}

export function showRecoveryCode() {
  try { localStorage.removeItem(K_RECOVERY_HIDDEN); } catch {}
}

/* ── Profile cache ──────────────────────────────────────── */

/**
 * Read the locally cached profile.
 *
 * Returns the profile object only when:
 *   - a cache entry exists,
 *   - its `id` matches `expectedId` (if provided),
 *   - it's younger than 30 days.
 *
 * Otherwise returns null — the caller should fetch.
 */
export function getCachedProfile(expectedId) {
  try {
    const raw = localStorage.getItem(K_CACHE);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (expectedId && parsed?.id !== expectedId) return null;
    if (Date.now() - (parsed?.cachedAt ?? 0) > CACHE_TTL_MS) return null;

    return parsed.profile ?? null;
  } catch {
    return null;
  }
}

export function setCachedProfile(id, profile) {
  try {
    localStorage.setItem(K_CACHE, JSON.stringify({
      id,
      profile,
      cachedAt: Date.now(),
    }));
  } catch {}
}

export function clearCachedProfile() {
  try { localStorage.removeItem(K_CACHE); } catch {}
}