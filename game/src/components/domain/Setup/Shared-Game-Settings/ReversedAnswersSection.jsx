import { ReversedAnswersPicker } from '../ReversedAnswersPicker/ReversedAnswersPicker.jsx';

export function ReversedAnswersSection({ value, onChange, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Reversed answers</h3>
      <p className="text-xs text-ink-muted">Flip the answers — read them backwards, or as scrambled letters.</p>
      <ReversedAnswersPicker value={value} onChange={onChange} disabled={readOnly} />
    </section>
  );
}