// game/src/components/Avatar/PlayerAvatar.jsx
import { getAvatarUrl, DEFAULT_AVATAR_STYLE } from './AvatarProvider.js';

/**
 * Renders a player's avatar.
 *
 * Props:
 *   seed    — string used to deterministically generate the avatar
 *             (typically the player's name)
 *   style   — DiceBear style slug, sourced from the room config
 *   size    — pixel size (square)
 *   ring    — Tailwind ring color class, e.g. 'ring-accent'
 *   alt     — alt text; empty by default (avatars are decorative)
 *
 * The URL is resolved through `avatarProvider.js` — changing provider
 * is a one-file edit.
 */
export function PlayerAvatar({
  seed,
  style = DEFAULT_AVATAR_STYLE,
  size = 32,
  ring = 'ring-border',
  alt = '',
}) {
  const src = getAvatarUrl(seed, { style });

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={[
        'rounded-full shrink-0 bg-surface-2',
        'ring-1',
        ring,
      ].join(' ')}
      style={{ width: size, height: size }}
    />
  );
}