// game/src/components/domain/Rounds/ProgressBar.jsx
import { SegmentedProgress } from '../../ui/SegmentedProgress.jsx';

/**
 * Segmented progress bar — one segment per round.
 *
 *   - Future round        → empty track
 *   - Current round       → fill proportional to question progress,
 *                           colored by the partial tier (correct-so-far)
 *   - Completed round     → full fill, colored by the final tier
 *
 * Tier thresholds:
 *   ratio ≥ 0.8  → correct (olive/green)
 *   ratio ≥ 0.5  → highlight (amber/gold)
 *   ratio  < 0.5 → wrong (rust)
 *   no answers   → neutral (accent — used before the first pick)
 *
 * This component maps single-player session state to the segments
 * consumed by SegmentedProgress.
 */

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
}) {
  const segments = Array.from({ length: totalRounds }).map((_, i) => {
    // ── Completed round ──
    if (i < roundIndex) {
      const s = roundScores[i] ?? { correct: 0, total: questionsInRound };
      return { fill: 1, tier: tierFor(s.correct, s.total) };
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