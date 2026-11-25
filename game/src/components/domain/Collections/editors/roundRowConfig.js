// game/src/components/domain/Collections/editor/roundRowConfig.js

export function roundToConfig(round) {
  return {
    questionTypes: round.questionTypes || [],
    answerMode: round.answerMode || 'choose',
    roundCount: round.rounds || 10,
    reversedAnswers: round.reversedAnswers || 'no',
    timer: round.timer ?? null,
    audioRendition: round.reversedAudio ? 'reverse' : 'forward',
    instruments: round.instruments || 'none',
    skips: round.skips ?? 0,
    removes: round.removes ?? 0,
    reveals: round.reveals ?? 0,
    memoryGame: round.memoryGame || 'none',
    
    // ✅ Pass through whatever mode is stored ('none', 'speed', or 'collect')
    mode: round.mode || 'none',
  };
}

export function configToRound(config, prev) {
  return {
    ...prev,
    questionTypes: config.questionTypes,
    answerMode: config.answerMode,
    rounds: config.roundCount,
    reversedAnswers: config.reversedAnswers,
    reversedAudio: config.audioRendition === 'reverse',
    instruments: config.instruments,
    timer: config.timer ?? null,
    skips: config.skips ?? 0,
    removes: config.removes ?? 0,
    reveals: config.reveals ?? 0,
    memoryGame: config.memoryGame || 'none',
    
    // ✅ Persist mode exactly as selected
    mode: config.mode || 'none',
  };
}