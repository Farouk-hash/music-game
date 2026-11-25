import { ChoiceCard } from "../ChoiceCard/ChoiceCard";

export function SporcleModeSection({ mode, setMode, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Game mode</h3>
      <p className="text-xs text-ink-muted">How scoring works.</p>
      <div className="grid grid-cols-2 gap-3">
        <ChoiceCard
          active={mode === 'speed'}
          onClick={readOnly ? undefined : () => setMode('speed')}
          title="Speed"
          description="First correct answer wins the point. Question ends immediately."
          disabled={readOnly}
        />
        <ChoiceCard
          active={mode === 'collect'}
          onClick={readOnly ? undefined : () => setMode('collect')}
          title="Collect"
          description="Everyone answers. Each correct answer earns a point."
          disabled={readOnly}
        />
      </div>
    </section>
  );
}