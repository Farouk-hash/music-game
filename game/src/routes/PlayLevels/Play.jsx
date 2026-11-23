// game/src/routes/PlayLevels/Play.jsx
import { usePlayParams } from '@/hooks/rounds/usePlayParams.js';
import { useRound } from '@/hooks/rounds/useRound.js';
import { useGameEngine } from '@/hooks/rounds/useGameEngine.js';
import PlayView from '@/components/domain/Play/PlayView.jsx';

// Module-scope so its identity is stable (useGameEngine memoizes on it).
// Accepts the rounds array (what useGameEngine passes) or a whole response.
function normalizeRounds(input) {
  const rounds = Array.isArray(input) ? input : input?.rounds ?? [];
  return rounds.map((r) => {
    // Already in multi-question shape: pass through.
    if (Array.isArray(r.questions)) return r;
    return {
      clip: r.clip,
      lyrics: r.lyrics,
      revealClip: r.revealClip,
      source: r.source,
      questions: [{
        type: r.type,
        prompt: r.question.prompt,
        options: r.question.options,
        correctValue: r.question.correctValue,
      }],
    };
  });
}

// Offline handling lives in <OnlineOnly> (see App.jsx): this component is never
// mounted while offline, so useRound cannot start a request.
export default function Play() {
  const params = usePlayParams();
  console.log('Memory Mode:', params.memoryGame)
  const engine = useGameEngine(useRound, params, normalizeRounds);
  return <PlayView variant="level1" params={params} {...engine} />;
}