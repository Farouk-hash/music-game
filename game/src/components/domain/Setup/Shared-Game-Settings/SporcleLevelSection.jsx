import { ChoiceCard } from "../ChoiceCard/ChoiceCard";

export function SporcleLevelSection({ level, setLevel, readOnly }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Level</h3>
      <p className="text-xs text-ink-muted">How many questions you get from each clip.</p>
      <div className="grid grid-cols-2 gap-3">
        <ChoiceCard
          active={level === 1}
          onClick={readOnly ? undefined : () => setLevel(1)}
          title="Level 1"
          description="One question per clip."
          disabled={readOnly}
        />
        <ChoiceCard
          active={level === 2}
          onClick={readOnly ? undefined : () => setLevel(2)}
          title="Level 2"
          description="Multiple questions per clip."
          disabled={readOnly}
        />
      </div>
    </section>
  );
}