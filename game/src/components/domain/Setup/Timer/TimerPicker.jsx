// game/src/components/domain/Setup/Timer/TimerPicker.jsx
import { getTimerOptions } from '@/constants/timer.js';
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../ChoiceCard/ChoiceCard';

export function TimerPicker({ value, onChange, disabled = false }) {
  const OPTIONS = getTimerOptions();

  return (
    <HorizontalScroll>
      {OPTIONS.map((opt) => (
        <ChoiceCard
          key={opt.label}
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