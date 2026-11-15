// game/src/components/domain/Setup/ReversedAudio/ReversedAudioPicker.jsx
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../Modals/ChoiceCard.jsx';

export function ReversedAudioPicker({ 
  value, 
  onChange, 
  disabled = false, 
  reversedClipsCount = 0 
}) {
  const options = [
    { 
      value: 'forward', 
      label: 'Forward', 
      hint: 'Play normally' 
    },
    { 
      value: 'reverse', 
      label: 'Reversed', 
      hint: reversedClipsCount > 0 ? `${reversedClipsCount} available` : 'No clips' 
    },
  ];

  return (
    <HorizontalScroll size="lg">
      {options.map((opt) => (
        <ChoiceCard
          key={opt.value}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          description={opt.hint}
          disabled={disabled || (opt.value === 'reverse' && reversedClipsCount === 0)}
        />
      ))}
    </HorizontalScroll>
  );
}