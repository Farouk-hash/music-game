export function flattenSharedRounds(rounds = []) {
  const out = [];

  rounds.forEach((round, ri) => {
    const questions = Array.isArray(round.questions)
      ? round.questions
      : round.question
        ? [{ type: round.type, ...round.question }]
        : [];

    questions.forEach((q, qi) => {
      out.push({
        id: `${round.slotId ?? round.setId ?? ri}:${qi}`,
        type: q.type ?? round.type,
        prompt: q.prompt,
        options: q.options ?? [],
        correctValue: q.correctValue,

        // Context for <PromptSource />
        clip: round.clip ?? null,
        clips: round.clips ?? null,
        lyrics: round.lyrics ?? null,
        revealClip: round.revealClip ?? null,
        source: round.source ?? null,
        slotId: round.slotId,
        setId: round.setId,
        
        // ✅ CRITICAL: Track grouping metadata for batched navigation
        trackSlotId: round.slotId ?? round.setId ?? ri,
        trackQuestionIndex: qi,
        totalQuestionsInTrack: questions.length,
      });
    });
  });

  return out;
}