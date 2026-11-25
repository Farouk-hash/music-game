// game/src/components/domain/Setup/Lifelines/LifelinesPicker.jsx
import { LIFELINE_OPTIONS } from '@/constants/lifelines';
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../Modals/ChoiceCard'; 
export function LifelinesPicker({ value = 0, onChange, disabled = false, max = 10 }) {
  // Filter options so we don't show numbers higher than the max allowed
  const options = LIFELINE_OPTIONS.filter(opt => opt <= max);

  return (
    <HorizontalScroll >
      {options.map((opt) => (
        <ChoiceCard
          key={opt}
          active={value === opt}
          onClick={() => onChange(opt)}
          title={opt === 0 ? 'Off' : String(opt)}
          description={opt === 0 ? 'Disabled' : `${opt} available`}
          disabled={disabled}
        />
      ))}
    </HorizontalScroll>
  );
}