// game/src/hooks/rounds/tagMemoryRounds.js
//
// Marks which rounds are "memory" rounds.
//
// usePlaySession and QuestionCard read `isMemory` from the QUESTION
// (currentRound.questions[i].isMemory), so the flag must be written onto every
// question of a selected round. The round-level flag is kept too, for any code
// that reads it there.
export function tagMemoryRounds(rounds, mode) {
  if (!rounds?.length) return rounds;
  if (mode !== 'mixed' && mode !== 'all') return rounds;

  const count = mode === 'all'
    ? rounds.length
    : Math.max(rounds.length >= 2 ? 1 : 0, Math.round(rounds.length * 0.4)); // ~40%

  // Fisher-Yates shuffle of the indices, then take the first `count`
  const indices = Array.from({ length: rounds.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const selected = new Set(indices.slice(0, count));

  return rounds.map((r, i) => {
    if (!selected.has(i)) return r;
    return {
      ...r,
      isMemory: true,
      questions: (r.questions ?? []).map((q) => ({ ...q, isMemory: true })),
    };
  });
}