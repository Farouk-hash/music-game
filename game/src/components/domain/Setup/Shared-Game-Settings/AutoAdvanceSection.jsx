export function AutoAdvanceSection({ value, onChange, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Auto-advance</h3>
      <p className="text-xs text-ink-muted">Seconds after reveal before the next question. 0 = host advances manually.</p>
      <input
        type="number"
        min={0}
        max={30}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
        className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none disabled:opacity-50"
      />
    </section>
  );
}