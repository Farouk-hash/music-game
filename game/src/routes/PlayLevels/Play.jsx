import { usePlayParams } from '@/hooks/rounds/usePlayParams.js';
import { useRound } from '@/hooks/rounds/useRound.js';
import { useGameEngine } from '@/hooks/rounds/useGameEngine.js';
import PlayView from '@/components/domain/Play/PlayView.jsx';

function normalizeRounds(rounds) {
  return rounds.map((r) => ({
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
  }));
}

export default function Play() {
  const params = usePlayParams();
  const engine = useGameEngine(useRound, params, normalizeRounds);

  return <PlayView variant="level1" params={params} {...engine} />;
}