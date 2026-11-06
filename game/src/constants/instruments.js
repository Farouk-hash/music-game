// game/src/constants/instruments.js

export const INSTRUMENT_OPTIONS = [
  { value: 'none',  label: 'None',  hint: 'Hear the original audio (vocals included).' },
  { value: 'mixed', label: 'Mixed', hint: 'Half the rounds use instruments (no vocals).' },
  { value: 'all',   label: 'All',   hint: 'Every round uses instruments.' },
];

export const VALID_INSTRUMENTS = new Set(INSTRUMENT_OPTIONS.map((o) => o.value));