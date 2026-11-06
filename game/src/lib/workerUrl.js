// game/src/lib/workerUrl.js
//
// Pure functions for turning Worker-relative asset paths into absolute URLs.
// All R2-backed assets (avatars, collection covers, instrument images)
// are served from the Worker origin with a relative path like
//   /profiles/:id/avatar
//   /profiles/:pid/collections/:cid/cover
// Passing those straight to <img src> resolves against the CLIENT origin
// and 404s. These helpers prefix them correctly.
//
// The same helpers also handle the transient preview URLs the editor uses:
//   blob:http://localhost:5174/...
// — which are already absolute and must NOT be prefixed.
//
// Non-React — usable from anywhere. React users should prefer
// useWorkerImage() (hooks/ui/useWorkerImage.js) which wraps these plus
// load-state tracking.

import { BASE } from './api.js';

/**
 * Prefix a relative path with the Worker origin. Pass-through if the
 * path already carries any URI scheme (http:, https:, blob:, data:, ...).
 * Returns null for falsy input.
 */
export function absoluteWorkerUrl(path) {
  if (!path) return null;
  // Any scheme-prefixed URL is already absolute — never prefix it.
  // Covers http(s):, blob:, data:, and future schemes.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Resolve a cover-shaped object into an absolute URL, or null.
 * Covers follow the shape: { kind: 'uploaded' | 'generated', url }
 * Only uploaded covers have a URL to load; generated ones fall back
 * to a client-rendered placeholder.
 */
export function resolveCoverUrl(cover) {
  if (!cover || cover.kind !== 'uploaded' || !cover.url) return null;
  return absoluteWorkerUrl(cover.url);
}

/**
 * Resolve a profile avatar into an absolute URL, or null.
 * Mirrors the shape used by avatarProvider / absoluteAvatarUrl.
 */
export function resolveAvatarUrl(profile) {
  if (profile?.avatar?.kind !== 'uploaded') return null;
  return absoluteWorkerUrl(`/profiles/${profile.id}/avatar`);
}