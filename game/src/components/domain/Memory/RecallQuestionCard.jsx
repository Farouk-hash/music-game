import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { POSITION_LABELS } from '@/constants';

const labelFor = (opt, type) =>
  type === 'name-position' ? POSITION_LABELS[opt.value] ?? opt.label : opt.label;

export function RecallQuestionCard({ 
  item, 
  globalIdx, 
  selectedValue, 
  isCorrect, 
  hasAnswer, 
  submitted, 
  onSelect, 
  getStatus 
}) {
  const correctLabel = labelFor(
    item.options.find(o => o.value === item.correctValue), 
    item.type
  );

  return (
    <BorderContainer 
      border="all" 
      className={`flex-1 p-5 space-y-3 ${
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
          {globalIdx + 1}
        </span>
        <p className="text-base font-medium text-ink leading-snug">{item.prompt}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 pl-10">
        {item.options.map(opt => {
          const isSelected = selectedValue === opt.value;
          const status = submitted ? getStatus(item, opt.value) : null;
          
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
              onClick={() => onSelect(item.roundIndex, item.questionIndex, opt.value)}
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
}