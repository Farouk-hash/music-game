import { options } from '@/constants/memoryGameOptions.js';
import { ChoiceCard } from '../Modals/ChoiceCard';

export function MemoryGamePicker({ value, onChange, disabled }) {


  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
    </div>
  );
}