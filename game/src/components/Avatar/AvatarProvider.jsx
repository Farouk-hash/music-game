// game/src/components/Avatar/avatarProvider.js
/**
 * Avatar provider.
 *
 * Backed by DiceBear's HTTP API. The style is chosen per-room (see
 * `pickRoomAvatarStyle`), so every player in a room shares the same
 * visual style but gets a distinct face from their own seed.
 *
 *   https://www.dicebear.com/styles/
 */

const DICEBEAR_BASE = 'https://api.dicebear.com/10.x';

export const DEFAULT_AVATAR_STYLE = 'adventurer-neutral';

/**
 * Curated list of DiceBear styles suitable for player avatars.
 * Skips abstract, technical, and animated styles.
 *
 * Only `slug` is used at runtime; `label` is for tooltips/debug.
 */
export const AVATAR_STYLES = [
  { slug: 'adventurer-neutral', label: 'Adventurer' },
  { slug: 'adventurer',         label: 'Adventurer Full' },
  { slug: 'big-smile',          label: 'Big Smile' },
  { slug: 'fun-emoji',          label: 'Fun Emoji' },
  { slug: 'micah',              label: 'Micah' },
  { slug: 'miniavs',            label: 'Miniavs' },
  { slug: 'personas',           label: 'Personas' },
  { slug: 'open-peeps',         label: 'Open Peeps' },
  { slug: 'lorelei',            label: 'Lorelei' },
  { slug: 'notionists',         label: 'Notionists' },
  { slug: 'big-ears',           label: 'Big Ears' },
  { slug: 'bottts',             label: 'Robots' },
  { slug: 'pixel-art',          label: 'Pixel Art' },
  { slug: 'croodles',           label: 'Croodles' },
];

const VALID_STYLES = new Set(AVATAR_STYLES.map(s => s.slug));

/**
 * Pick a random style for a new room.
 * Called once, on room creation, by the host.
 */
export function pickRoomAvatarStyle() {
  const idx = Math.floor(Math.random() * AVATAR_STYLES.length);
  return AVATAR_STYLES[idx].slug;
}

/**
 * Build an avatar URL.
 *
 * @param {string} seed   — usually the player's name or ID
 * @param {object} [opts]
 * @param {string} [opts.style]  — must be a known DiceBear style slug
 * @param {string} [opts.format] — 'svg' (default) | 'png'
 * @returns {string}
 */
export function getAvatarUrl(seed, { style = DEFAULT_AVATAR_STYLE, format = 'svg' } = {}) {
  const safeStyle = VALID_STYLES.has(style) ? style : DEFAULT_AVATAR_STYLE;
  const s = encodeURIComponent(String(seed ?? 'player'));
  return `${DICEBEAR_BASE}/${safeStyle}/${format}?seed=${s}`;
}

/**
 * Fallback URL — used if a seed is missing.
 */
export function getFallbackUrl(style = DEFAULT_AVATAR_STYLE) {
  return getAvatarUrl('?', { style });
}