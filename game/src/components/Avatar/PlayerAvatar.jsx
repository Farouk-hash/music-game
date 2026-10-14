// game/src/components/Avatar/PlayerAvatar.jsx
import { getAvatarUrl, DEFAULT_AVATAR_STYLE } from './AvatarProvider.jsx';
import { absoluteAvatarUrl } from '../../lib/profileApi.js';

/**
 * Renders a player's avatar.
 *
 * Resolution order:
 *   1. resolved profile with `avatar.kind === 'uploaded'` → profile avatar endpoint
 *   2. resolved profile with `avatar.kind === 'generated'` → DiceBear (profile style + seed)
 *   3. fallback DiceBear using `seed` + `style`
 *
 * `avatar` is a profile record as returned by `profileApi.get(id)`
 * (after unwrapping `{ profile }`). See `useRoomProfiles`.
 */
export function PlayerAvatar({
  seed,
  style = DEFAULT_AVATAR_STYLE,
  avatar = null,
  size = 32,
  ring = 'ring-border',
  alt = '',
}) {
  const src = resolveAvatarSrc({ seed, style, avatar });

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={[
        'rounded-full shrink-0 bg-surface-2 object-cover',
        'ring-1',
        ring,
      ].join(' ')}
      style={{ width: size, height: size }}
    />
  );
}

function resolveAvatarSrc({ seed, style, avatar }) {
  if (avatar?.avatar) {
    const a = avatar.avatar;
    if (a.kind === 'uploaded') {
      const url = absoluteAvatarUrl(avatar);
      if (url) return url;
    }
    if (a.kind === 'generated' && a.style) {
      return getAvatarUrl(a.seed ?? seed, { style: a.style });
    }
  }
  return getAvatarUrl(seed, { style });
}