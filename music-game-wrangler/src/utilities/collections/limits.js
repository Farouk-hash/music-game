// music-game-wrangler/src/utilities/collections/limits.js

export const COLLECTION_NAME_MAX          = 64;
export const COLLECTIONS_PER_PROFILE_MAX  = 10;
export const ROUNDS_PER_COLLECTION_MAX    = 30;
export const GENRES_PER_COLLECTION_MAX    = 50;
export const ARTISTS_PER_COLLECTION_MAX   = 200;
export const YEARS_PER_SET_MAX            = 100;
export const ROUNDS_COUNT_MIN             = 1;
export const ROUNDS_COUNT_MAX             = 50;
export const TIMER_MIN                    = 5;
export const TIMER_MAX                    = 300;
export const QUESTION_TYPES_PER_ROUND_MAX = 8;

export const COVER_MAX_BYTES              = 128 * 1024;
export const COVER_ALLOWED_MIME           = ['image/jpeg', 'image/png', 'image/webp'];

export const VALID_LEVELS   = [1, 2, 3];
export const VALID_MODES    = ['speed', 'collect'];
export const VALID_ANSWER_MODES = ['choose', 'type'];
export const VALID_QUESTION_TYPES = [
  'name-track', 'name-artist', 'name-album', 'name-featured', 'name-position',
  'lyrics-track', 'lyrics-artist', 'lyrics-album',
];
export const VALID_INSTRUMENTS = ['none', 'mixed', 'all'];