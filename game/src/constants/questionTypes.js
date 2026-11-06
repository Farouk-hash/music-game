// game/src/constants/questionTypes.js

export const QUESTION_TYPES = [
  { value: 'name-track',    label: 'Track name' },
  { value: 'name-artist',   label: 'Artist name' },
  { value: 'name-album',    label: 'Album name' },
  { value: 'name-featured', label: 'Featured artist' },
  { value: 'name-position', label: 'Clip position' },
  { value: 'lyrics-track',  label: 'Lyric → track' },
  { value: 'lyrics-artist', label: 'Lyric → artist' },
  { value: 'lyrics-album',  label: 'Lyric → album' },
];

export const ALL_TYPES = [
  { value: 'name-track',    label: 'Track name',      hint: 'What is the song?' },
  { value: 'name-artist',   label: 'Artist name',     hint: 'Who made it?' },
  { value: 'name-album',    label: 'Album name',      hint: 'What album is it from?' },
  { value: 'name-featured', label: 'Featured artist', hint: 'Who is featured?' },
  { value: 'name-position', label: 'Clip position',   hint: 'Start, middle, or end?' },
  { value: 'lyrics-track',  label: 'Lyric → track',   hint: 'Read the lyric, name the song' },
  { value: 'lyrics-artist', label: 'Lyric → artist',  hint: 'Read the lyric, name the singer' },
  { value: 'lyrics-album',  label: 'Lyric → album',   hint: 'Read the lyric, name the album' },
];

// Raw 8-string array — used to initialize GameSettingsContext.
export const QUESTION_TYPE_VALUES = QUESTION_TYPES.map((t) => t.value);

export const VALID_QUESTION_TYPES = new Set(QUESTION_TYPE_VALUES);

export function getQuestionTypeLabel(value) {
  return QUESTION_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const DISABLED_HINTS = {
  'name-artist':   'Needs at least 2 selected artists.',
  'lyrics-artist': 'Needs at least 2 selected artists.',
};