import { LifelinesPicker } from '../Lifelines/LifeLinesPickers.jsx';
import { LIFELINE_DEFINITIONS } from '@/constants/lifelines';

export function LifelinesSection({ skips, removes, reveals, roundCount, setSkips, setRemoves, setReveals, readOnly }) {
  const lifelineValues = { skips, removes, reveals };
  const lifelineSetters = { skips: setSkips, removes: setRemoves, reveals: setReveals };

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Lifelines</h3>
      <p className="text-xs text-ink-muted">Limited actions available during the game. Total lifelines cannot exceed round count.</p>
      <div className="space-y-4">
        {LIFELINE_DEFINITIONS.map(({ key, label, hint }) => {
          const otherLifelinesSum =
            (key === 'skips' ? 0 : skips) +
            (key === 'removes' ? 0 : removes) +
            (key === 'reveals' ? 0 : reveals);
          const maxAllowed = Math.max(0, roundCount - otherLifelinesSum);

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{label}</span>
                <span className="text-[11px] text-ink-subtle">{hint}</span>
              </div>
              <LifelinesPicker
                value={lifelineValues[key]}
                onChange={lifelineSetters[key]}
                disabled={readOnly}
                max={maxAllowed}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}