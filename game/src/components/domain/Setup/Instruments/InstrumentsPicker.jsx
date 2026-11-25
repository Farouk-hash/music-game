// game/src/components/domain/Setup/Instruments/InstrumentsPicker.jsx
import { INSTRUMENT_OPTIONS } from "@/constants";
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../ChoiceCard/ChoiceCard.jsx';

export function InstrumentsPicker({ value, onChange, disabled = false }) {
  return (
    <HorizontalScroll >
      {INSTRUMENT_OPTIONS.map((opt) => (
        <ChoiceCard
          key={opt.value}
          active={value === opt.value}
          onClick={() => !disabled && onChange(opt.value)}
          title={opt.label}
          description={opt.hint}
          disabled={disabled}
        />
      ))}
    </HorizontalScroll>
  );
}