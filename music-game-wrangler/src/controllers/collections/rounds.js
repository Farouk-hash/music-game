// music-game-wrangler/src/controllers/collections/rounds.js
export function buildReplaceRoundsStatements(env, collectionId, rounds) {
  const statements = [
    env.DB.prepare('DELETE FROM collection_rounds WHERE collection_id = ?').bind(collectionId),
  ];

  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    statements.push(
      env.DB.prepare(
        `INSERT INTO collection_rounds (
           collection_id, position, level, question_types, answer_mode, mode,
           rounds, reversed_answers, reversed_audio, instruments, timer
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        collectionId,
        i,
        r.level,
        JSON.stringify(r.questionTypes),
        r.answerMode,
        r.mode,
        r.rounds,
        r.reversedAnswers,       // ← 'no' | 'some' | 'all'
        r.reversedAudio ? 1 : 0,
        r.instruments,
        r.timer ?? null,
      ),
    );
  }

  return statements;
}