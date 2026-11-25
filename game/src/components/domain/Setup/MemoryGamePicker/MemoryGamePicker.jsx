import { options } from '@/constants/memoryGameOptions.js';
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../ChoiceCard/ChoiceCard';

export function MemoryGamePicker({ value, onChange, disabled }) {
  return (
    <HorizontalScroll >
      {options.map((opt) => (
        <ChoiceCard
          key={opt.key}
          active={value === opt.key}
          onClick={() => !disabled && onChange(opt.key)}
          title={opt.label}
          description={opt.desc}
          disabled={disabled}
        />
      ))}
    </HorizontalScroll>
  );
}