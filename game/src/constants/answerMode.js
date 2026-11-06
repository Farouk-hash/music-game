// game/src/constants/answerMode.js

export const ANSWER_MODE_OPTIONS = [
  { value: 'choose', label: 'Choose', hint: 'Pick from multiple options.' },
  { value: 'type',   label: 'Type',   hint: 'Type the answer yourself.' },
];

export const VALID_ANSWER_MODES = new Set(ANSWER_MODE_OPTIONS.map((o) => o.value));