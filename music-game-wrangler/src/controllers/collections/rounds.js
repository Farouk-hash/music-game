// music-game-wrangler/src/controllers/collections/rounds.js
export function buildReplaceRoundsStatements(
  env,
  parentId,
  rounds,
  fkColumn = 'collection_id',
  table = 'collection_rounds'
) {
  const statements = [
    env.DB.prepare(`DELETE FROM ${table} WHERE ${fkColumn} = ?`).bind(parentId),
  ];

  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    statements.push(
      env.DB.prepare(
        `INSERT INTO ${table} (
           ${fkColumn}, position, level, question_types, answer_mode, mode,
           rounds, reversed_answers, reversed_audio, instruments, timer
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        parentId,
        i,
        r.level,
        JSON.stringify(r.questionTypes),
        r.answerMode,
        r.mode,
        r.rounds,
        r.reversedAnswers,
        r.reversedAudio ? 1 : 0,
        r.instruments,
        r.timer ?? null,
      ),
    );
  }

  return statements;
}