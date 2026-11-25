// game/src/components/domain/Setup/ReversedAudio/ReversedAudioPicker.jsx
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { ChoiceCard } from '../Modals/ChoiceCard.jsx';
import { REVERSED_AUDIO_OPTIONS } from '@/constants/reversedAudioOptions.js';

export function ReversedAudioPicker({ 
  value, 
  onChange, 
  disabled = false, 
  reversedClipsCount = 0 
}) {


  return (
    <HorizontalScroll>
      {REVERSED_AUDIO_OPTIONS.map((opt) => (
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