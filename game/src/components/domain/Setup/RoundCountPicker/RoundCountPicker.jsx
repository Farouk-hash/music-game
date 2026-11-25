// game/src/components/domain/RoundCountPicker.jsx
import { ROUND_COUNT_OPTIONS } from "@/constants/roundCount";
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from "../Modals/ChoiceCard";

export function RoundCountPicker({ value, onChange, disabled = false }) {
  return (
    <HorizontalScroll >
      {ROUND_COUNT_OPTIONS.map((opt) => (
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