import { TimerPicker } from '../Timer/TimerPicker.jsx';

export function TimerSection({ value, onChange, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Timer</h3>
      <TimerPicker value={value} onChange={onChange} disabled={readOnly} />
    </section>
  );
}