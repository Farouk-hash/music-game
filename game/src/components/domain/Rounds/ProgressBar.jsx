import { SegmentedProgress } from '../../ui/SegmentedProgress.jsx';

function tierFor(correct, total) {
  if (!total || total === 0) return 'neutral';
  const ratio = correct / total;
  if (ratio >= 0.8) return 'correct';
  if (ratio >= 0.5) return 'highlight';
  return 'wrong';
}

export function ProgressBar({
  totalRounds,
  roundIndex,
  questionsInRound,
  questionIndex,
  revealed,
  roundScores = {},
  recallPhase = false, // ✅ NEW PROP
}) {
  const segments = Array.from({ length: totalRounds }).map((_, i) => {
    // ── Completed round ──
    if (i < roundIndex) {
      const s = roundScores[i] ?? { correct: 0, total: questionsInRound };
      // During recall phase, studied-but-not-recalled rounds stay neutral
      const tier = recallPhase ? 'neutral' : tierFor(s.correct, s.total);
      return { fill: 1, tier };
    }

    // ── Future round ──
    if (i > roundIndex) {
      return { fill: 0, tier: 'neutral' };
    }

    // ── Current round ──
    const s = roundScores[roundIndex];
    const correctSoFar = s?.correct ?? 0;
    const answeredSoFar = questionIndex + (revealed ? 1 : 0);
    const liveTier = answeredSoFar > 0
      ? tierFor(correctSoFar, answeredSoFar)
      : 'neutral';
    const fill = answeredSoFar / questionsInRound;
    return { fill, tier: liveTier };
  });

  return <SegmentedProgress segments={segments} />;
}