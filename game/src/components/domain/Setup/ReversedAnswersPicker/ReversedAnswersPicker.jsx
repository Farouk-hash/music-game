// game/src/components/domain/Setup/ReversedAnswersPicker/ReversedAnswersPicker.jsx
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../Modals/ChoiceCard.jsx';
import { REVERSED_ANSWER_OPTIONS } from '@/constants/reversedAnswers';

export function ReversedAnswersPicker({ value, onChange, disabled }) {
  return (
    <HorizontalScroll >
      {REVERSED_ANSWER_OPTIONS.map((opt) => (
        <ChoiceCard
          key={opt.value}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          description={opt.hint}
          disabled={disabled}
        />
      ))}
    </HorizontalScroll>
  );
}