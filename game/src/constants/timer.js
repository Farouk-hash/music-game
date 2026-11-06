// game/src/constants/timer.js
// Moved here from hooks/rounds/usePlayParams.js so pickers and the
// collection editor can import without a hook cycle.

export const TIMER_SECONDS = {
  off: 0,
  choose: 5,
  type:   15,
};

export function getTimerOptions(answerMode) {
  const perQuestion = answerMode === 'type'
    ? TIMER_SECONDS.type
    : TIMER_SECONDS.choose;

  return [
    { value: 'off', label: 'No timer', hint: 'Take your time' },
    { value: 'on',  label: 'Timed',    hint: `${perQuestion}s per question` },
  ];
}