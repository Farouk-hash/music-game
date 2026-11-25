import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../Modals/ChoiceCard.jsx';
import { MULTIPLAYER_MODE_OPTIONS } from '@/constants/potato-multiplayersmode.js';


export function MultiplayerModePicker({ value, onChange, disabled }) {
  return (
    <HorizontalScroll >
      {MULTIPLAYER_MODE_OPTIONS.map((opt) => (
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