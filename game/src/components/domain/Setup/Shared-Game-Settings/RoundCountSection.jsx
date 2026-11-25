import { RoundCountPicker } from '../RoundCountPicker/RoundCountPicker.jsx';

export function RoundCountSection({ value, onChange, isSporcle, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Rounds</h3>
      <p className="text-xs text-ink-muted">
        How many clips do you want to guess?
        {isSporcle && <span> Level 2 returns several questions per clip.</span>}
      </p>
      <RoundCountPicker value={value} onChange={onChange} disabled={readOnly} />
    </section>
  );
}