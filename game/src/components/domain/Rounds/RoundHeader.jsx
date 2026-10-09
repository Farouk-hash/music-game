// game/src/components/game/RoundHeader.jsx
export function RoundHeader({
  roundNumber,
  totalRounds,
  questionNumber,
  totalQuestions,
  score,
  showQuestionCounter = false,
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">
        Round <span className="text-ink">{roundNumber}</span>
        <span className="text-ink-subtle"> / {totalRounds}</span>
        {showQuestionCounter && (
          <span className="text-ink-subtle ml-3">
            Q{questionNumber} / {totalQuestions}
          </span>
        )}
      </span>
      <span className="text-ink">
        Score: <span className="text-highlight font-semibold">{score}</span>
      </span>
    </div>
  );
}