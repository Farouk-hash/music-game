// game/src/components/domain/AnswerModePicker/AnswerModePicker.jsx
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../Modals/ChoiceCard';
import { ANSWER_MODE_OPTIONS } from '@/constants';



export function AnswerModePicker({ value, onChange, disabled = false }) {
  return (
    <HorizontalScroll >
      {ANSWER_MODE_OPTIONS.map((opt) => (
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