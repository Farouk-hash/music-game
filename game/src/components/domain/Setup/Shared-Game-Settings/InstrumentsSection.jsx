import { InstrumentsPicker } from '../Instruments/InstrumentsPicker.jsx';

export function InstrumentsSection({ value, onChange, allowInstruments, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Instruments</h3>
      <p className="text-xs text-ink-muted">
        Play instrumental renditions (no vocals) instead of the original audio.
        {!allowInstruments && <span> Not available for this level.</span>}
      </p>
      <InstrumentsPicker
        value={value}
        onChange={onChange}
        disabled={!allowInstruments || readOnly}
      />
      <ul className="text-xs text-ink-subtle space-y-0.5 pt-1">
        <li><span className="text-ink-muted">None</span> — hear the original audio (vocals included).</li>
        <li><span className="text-ink-muted">Mixed</span> — half the rounds use instruments (no vocals).</li>
        <li><span className="text-ink-muted">All</span> — every round uses instruments.</li>
      </ul>
    </section>
  );
}