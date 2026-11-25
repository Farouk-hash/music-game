import { usePlayParams } from '@/hooks/rounds/solo/usePlayParams.js';
import { useRoundMulti } from '@/hooks/rounds/solo/useRoundMulti.js';
import { useGameEngine } from '@/hooks/rounds/solo/useGameEngine.js';
import PlayView from '@/components/domain/Play/PlayView.jsx';

export default function Play2() {
  const params = usePlayParams();
  // Level 2 data is already in the correct shape (has questions array), so no normalizeFn needed
  const engine = useGameEngine(useRoundMulti, params);

  return <PlayView variant="level2" params={params} {...engine} />;
}