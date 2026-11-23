// game/src/routes/Streak/fetchQuestions.js
import { api } from '@/lib/api.js';

export async function fetchStreakQuestions({
  genreId,
  artistIds,
  config,               // ChallengeConfig context
  challengeConfig,      // Generated challenge.batches from server
  totalBatches,
  questionsPerBatch,
  easyMode = false,
}) {
  // Fail immediately if the server didn't send the config
  if (!challengeConfig?.batches || challengeConfig.batches.length === 0) {
    throw new Error('Challenge configuration missing from server.');
  }

  const batches = [];
  // `easyModeBatches` is not part of the fallback config; `earlyBatches` is what
  // useStreak uses for the number of batches in easy mode, so fall back to it.
  // (Without the fallback, `undefined - 1` = NaN and easy mode threw
  // "Preset missing for batch 1".)
  const presetCap = easyMode
    ? (config.easyModeBatches ?? config.earlyBatches)
    : challengeConfig?.batches?.length ?? totalBatches;

  for (let b = 0; b < totalBatches; b++) {
    // In easy mode, we only use the first presets (warmup)
    const presetIndex = easyMode ? Math.min(b, presetCap - 1) : b;

    // Fetch the specific preset from the server's config
    const batchConfig = challengeConfig.batches[presetIndex];

    // Fail if the preset doesn't exist
    if (!batchConfig) {
      throw new Error(`Preset missing for batch ${b + 1}`);
    }

    const payload = {
      level: batchConfig.level,
      genres: [genreId],
      artists: artistIds,
      years: [],
      types: batchConfig.types,
      count: config.roundsPerBatch,        // From the context config
      minQuestions: questionsPerBatch,     // From the context math
      instruments: batchConfig.instruments,
      rendition: batchConfig.rendition,
      reversed: batchConfig.reversed,
    };

    // api.post fails fast with an offline error (no request is made) if the
    // connection is gone; the caller (Challenge.handleStart) shows a message.
    const data = await api.post('/round-dynamic', payload);

    const rawRounds =
      Array.isArray(data?.rounds) ? data.rounds :
      Array.isArray(data?.sets)   ? data.sets   :
      data?.round                 ? [data.round] :
      [];

    if (rawRounds.length === 0) {
      throw new Error(
        `Batch ${b + 1} (preset=${batchConfig.key ?? 'unknown'}) returned no rounds.`
      );
    }

    const raw = rawRounds[0];

    const questions = (Array.isArray(raw.questions) ? raw.questions : [])
      .map(q => ({
        type: q.type ?? raw.type ?? 'name-track',
        prompt: q.prompt,
        options: q.options,
        correctValue: q.correctValue,
      }))
      .slice(0, questionsPerBatch);

    if (questions.length === 0) {
      throw new Error(`Batch ${b + 1} has no questions.`);
    }

    let clip = raw.clip ?? null;
    if (!clip && Array.isArray(raw.clips) && raw.clips.length > 0) {
      const first = raw.clips[0];
      clip = {
        r2_key: first.r2Key,
        serveUrl: first.serveUrl,
        position: first.position ?? null,
      };
    }

    batches.push({
      roundId: raw.slotId ?? raw.setId ?? b,
      level: batchConfig.level,
      instruments: batchConfig.instruments,
      rendition: batchConfig.rendition,
      reversed: batchConfig.reversed,
      answerMode: batchConfig.answerMode,
      preset: batchConfig.key,               // Use the key from PRESET_DECK
      questions,
      clip,
      lyrics: raw.lyrics ?? null,
      source: raw.source ?? null,
      revealClip: raw.revealClip ?? null,
    });
  }

  return batches;
}