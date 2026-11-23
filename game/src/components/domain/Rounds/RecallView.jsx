import { useState } from 'react';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { POSITION_LABELS } from '@/constants';

export function RecallScreen({ recallItems, onSubmit, onFinish, isSubmitted }) {
  const [answers, setAnswers] = useState(new Map());
  const [locallySubmitted, setLocallySubmitted] = useState(false);
  // Use prop for submission state, but rely on it directly for button enabling
  const submitted = isSubmitted || locallySubmitted; 
  const allAnswered = answers.size === recallItems.length;

  const labelFor = (opt, type) =>
    type === 'name-position'
      ? POSITION_LABELS[opt.value] ?? opt.label
      : opt.label;

  function handleSelect(roundIndex, value) {
    if (submitted) return;
    setAnswers(prev => new Map(prev).set(roundIndex, value));
  }

  function handleSubmit() {
    if (!allAnswered || submitted) return;
    
    onSubmit(answers);
    setLocallySubmitted(true); 
  }

  function handleFinish() {
    onFinish();
  }

  function getOptionStatus(item, optValue) {
    const userAnswer = answers.get(item.roundIndex);
    if (optValue === item.correctValue) return 'correct';
    if (userAnswer === optValue && optValue !== item.correctValue) return 'wrong';
    return 'neutral';
  }

  const correctCount = submitted 
    ? recallItems.filter(item => answers.get(item.roundIndex) === item.correctValue).length 
    : 0;

  return (
    <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen pt-8 space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
          🔁 Recall Phase
        </p>
        <h2 className="text-2xl font-bold text-ink">
          {submitted ? 'Recall Results' : `Answer All ${recallItems.length} Memorized Questions`}
        </h2>
        <p className="text-sm text-ink-muted">
          {submitted 
            ? `You recalled ${correctCount} of ${recallItems.length} correctly.` 
            : 'No audio clues. Rely on your memory from the study phase.'}
        </p>
      </div>

      <div className="space-y-4">
        {recallItems.map((item, idx) => {
          const hasAnswer = answers.has(item.roundIndex);
          const selectedValue = answers.get(item.roundIndex);
          const isCorrect = submitted && selectedValue === item.correctValue;
          const correctLabel = labelFor(
            item.options.find(o => o.value === item.correctValue), 
            item.type
          );

          return (
            <BorderContainer 
              key={item.roundIndex} 
              border="all" 
              className={`p-5 space-y-3 ${
                submitted 
                  ? isCorrect 
                    ? 'border-correct/50 bg-correct-soft/10' 
                    : 'border-wrong/50 bg-wrong-soft/10'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  submitted 
                    ? isCorrect ? 'bg-correct text-bg' : 'bg-wrong text-bg'
                    : 'bg-accent-soft text-accent'
                }`}>
                  {idx + 1}
                </span>
                <p className="text-base font-medium text-ink leading-snug">{item.prompt}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pl-10">
                {item.options.map(opt => {
                  const isSelected = selectedValue === opt.value;
                  const status = submitted ? getOptionStatus(item, opt.value) : null;
                  
                  let buttonClass = 'w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ';
                  if (submitted) {
                    if (status === 'correct') buttonClass += 'bg-correct-soft border-correct text-ink';
                    else if (status === 'wrong') buttonClass += 'bg-wrong-soft border-wrong text-ink';
                    else buttonClass += 'bg-surface-2 border-border text-ink-muted opacity-60';
                  } else {
                    buttonClass += isSelected
                      ? 'bg-accent text-bg border-accent'
                      : 'bg-surface-2 border-border text-ink hover:border-accent-2';
                  }

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(item.roundIndex, opt.value)}
                      disabled={submitted}
                      className={buttonClass}
                    >
                      {labelFor(opt, item.type)}
                      {submitted && status === 'correct' && ' ✓'}
                      {submitted && status === 'wrong' && ' ✗'}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <p className={`text-xs pl-10 ${isCorrect ? 'text-correct' : 'text-wrong'}`}>
                  {isCorrect 
                    ? '✓ Correct! Your memory served you well.' 
                    : `Correct answer: ${correctLabel}`}
                </p>
              )}
              
              {!hasAnswer && !submitted && (
                <p className="text-[10px] text-ink-subtle pl-10">Select an answer to continue</p>
              )}
            </BorderContainer>
          );
        })}
      </div>

      {/* ✅ FIXED: Always enabled when submitted, regardless of local answers state */}
      <div className="flex justify-center pt-4">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="w-full max-w-xs"
          >
            Submit Recall Answers ({answers.size}/{recallItems.length})
          </Button>
        ) : (
          <Button
          key="finish-btn"
          variant='primary'
            onClick={handleFinish}
            className="w-full max-w-xs"
          >
            View Final Results →
          </Button>
        )}
      </div>
    </div>
  );
}