// game/src/components/domain/Collections/editor/EditorRounds.jsx
import { RoundRow } from './RoundRow.jsx';
import { CollapsibleSection } from '@/components/layout/CollapsibleSection.jsx';
import { IconList , IconPlus } from '@/icons';

export function EditorRounds({
  draft, disabledTypes, reversedClipsCount, addRound, removeRound, updateRound, moveRound, readOnly = false,
}) {
  return (
    <CollapsibleSection
      open={true}
      onToggle={() => {}} // In a modal, we can keep it always open, or add state if needed
      title="Rounds"
      icon={<IconList className="w-5 h-5" />}
      meta={draft.rounds.length > 0 ? `(${draft.rounds.length})` : null}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          {draft.rounds.map((round, i) => (
            <RoundRow
              key={i}
              round={round}
              index={i}
              total={draft.rounds.length}
              levels={draft.levels}
              disabledTypes={disabledTypes}
              reversedClipsCount={reversedClipsCount}
              onUpdate={(patch) => updateRound(i, patch)}
              onRemove={() => removeRound(i)}
              onMoveUp={() => moveRound(i, -1)}
              onMoveDown={() => moveRound(i, 1)}
              readOnly={readOnly}
            />
          ))}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={addRound}
            className="w-full h-10 rounded-md border border-dashed border-border bg-surface-2 text-sm text-ink-muted hover:border-accent-2 hover:text-ink transition-colors inline-flex items-center justify-center gap-2"
          >
            <IconPlus className="w-4 h-4" />
            Add round
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
}