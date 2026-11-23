import { useRecallState } from '@/hooks/memory/useRecallState.js';
import { RecallTree } from './RecallTree.jsx';
import { RecallQuestionCard } from './RecallQuestionCard.jsx';
import { Button } from '@/components/ui/Button.jsx';

export function RecallScreen({ recallItems, onSubmit, handleFinish }) {
  const {
    answers,
    submitted,
    allAnswered,
    correctCount,
    handleSelect,
    handleSubmit,
    getOptionStatus,
    setSubmitted,
  } = useRecallState(recallItems);

  const hasMultipleRounds = new Set(recallItems.map(i => i.roundIndex)).size > 1;
  const hasMultiQuestionRounds = Object.values(
    recallItems.reduce((acc, i) => {
      acc[i.roundIndex] = (acc[i.roundIndex] || 0) + 1;
      return acc;
    }, {})
  ).some(count => count > 1);

  const handleFinalSubmit = () => {
    handleSubmit();
    onSubmit(answers);
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen pt-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">🔁 Recall Phase</p>
        <h2 className="text-2xl font-bold text-ink">
          {submitted ? 'Recall Results' : `Answer All ${recallItems.length} Memorized Questions`}
        </h2>
        <p className="text-sm text-ink-muted">
          {submitted 
            ? `You recalled ${correctCount} of ${recallItems.length} correctly.` 
            : 'No audio clues. Rely on your memory from the study phase.'}
        </p>
      </div>

      {/* Tree Layout */}
      <RecallTree hasMultipleRounds={hasMultipleRounds} hasMultiQuestionRounds={hasMultiQuestionRounds}>
        {recallItems.map((item, idx) => {
          const uniqueKey = `${item.roundIndex}-${item.questionIndex}`;
          return (
            <RecallQuestionCard
              key={uniqueKey}
              item={item}
              globalIdx={idx}
              selectedValue={answers.get(uniqueKey)}
              isCorrect={submitted && answers.get(uniqueKey) === item.correctValue}
              hasAnswer={answers.has(uniqueKey)}
              submitted={submitted}
              onSelect={handleSelect}
              getStatus={getOptionStatus}
            />
          );
        })}
      </RecallTree>

      {/* Action Buttons */}
      <div className="flex justify-center pt-6">
        {!submitted ? (
          <Button
            key="submit-btn"
            onClick={handleFinalSubmit}
            disabled={!allAnswered}
            variant="primary"
            size="md"
            className="w-full max-w-xs"
          >
            Submit Recall Answers ({answers.size}/{recallItems.length})
          </Button>
        ) : (
          <button
            key="finish-btn"
            type="button"
            onClick={handleFinish}
            className="w-full max-w-xs h-10 px-4 rounded-md bg-accent text-bg font-medium 
                       hover:bg-accent-2 transition-colors duration-150 shadow-sm cursor-pointer"
          >
            View Final Results →
          </button>
        )}
      </div>
    </div>
  );
}