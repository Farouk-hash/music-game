import { AnswerModePicker } from '../AnswerModePicker/AnswerModePicker.jsx';

export function AnswerModeSection({ value, onChange, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Answer mode</h3>
      <p className="text-xs text-ink-muted">Choose from options, or type the answer yourself.</p>
      <AnswerModePicker value={value} onChange={onChange} disabled={readOnly} />
    </section>
  );
}