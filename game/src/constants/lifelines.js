// game/src/constants/lifelines.js
export const LIFELINE_OPTIONS = [0, 1, 2, 3, 5];

export const LIFELINE_DEFINITIONS = [
  {
    key: 'skips',
    label: 'Skips',
    hint: 'Advance past a question without answering',
    cost: 0,          // skips cost no score
    icon: 'skip',
  },
  {
    key: 'removes',
    label: 'Remove one',
    hint: 'Hide one wrong option',
    cost: 2,          // costs 2 points
    icon: 'remove',
  },
  {
    key: 'reveals',
    label: 'Reveals',
    hint: 'Show the correct answer',
    cost: 3,          // costs 3 points
    icon: 'reveal',
  },
];

export const DEFAULT_LIFELINES = {
  skips: 0,
  removes: 0,
  reveals: 0,
};

/** Lookup by key — { skips: 0, removes: 2, reveals: 3 } */
export const LIFELINE_COST = Object.fromEntries(
  LIFELINE_DEFINITIONS.map(d => [d.key, d.cost])
);