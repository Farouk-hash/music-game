// game/src/constants/timer.js
export const TIMER_SECONDS = {
  off: 0,
  short: 5,
  medium: 15,
  long: 20,
};

export function getTimerOptions() {
  return [
    { value: null, label: 'No timer', hint: 'Take your time' },
    { value: 5,    label: '5s',       hint: 'Fast' },
    { value: 15,   label: '15s',      hint: 'Normal' },
    { value: 20,   label: '20s',      hint: 'Relaxed' },
  ];
}