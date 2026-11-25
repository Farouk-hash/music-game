import { SharedGameSettings } from '../../Setup/Modals/SharedGameSettings.jsx';
import { Badge } from '../primitives/Badge.jsx';
import { IconChevronUp, IconChevronDown, IconTrash } from '@/icons';
import { ChoiceCard } from '../../Setup/Modals/ChoiceCard.jsx';
import { configToRound, roundToConfig } from './roundRowConfig.js';

const LEVELS = [1, 2, 3];

export function RoundRow({
  round, index, total, levels,
  disabledTypes,
  disabledReasons,
  reversedClipsCount,
  onUpdate, onRemove, onMoveUp, onMoveDown,
  readOnly = false,
}) {
  const availableLevels = LEVELS.filter((l) => levels.has(l));
  
  // Determine if this round is currently in Sporcle mode
  const isSporcleMode = round.mode === 'speed' || round.mode === 'collect';

  return (
    <div className="rounded-md border border-border bg-surface-2 p-4 space-y-4">
      {/* Header with Level Selector & Move/Delete Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Round {index + 1}
          </span>
          {readOnly ? (
            <Badge variant="default">L{round.level}</Badge>
          ) : (
            <select
              value={round.level}
              onChange={(e) => onUpdate({ level: Number(e.target.value) })}
              className="h-8 rounded border border-border bg-surface px-2 text-xs text-ink focus:border-accent focus:outline-none"
              aria-label="Round level"
            >
              {availableLevels.map((l) => (
                <option key={l} value={l}>L{l}</option>
              ))}
            </select>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onMoveUp} disabled={index === 0}
              className="inline-flex items-center justify-center h-8 w-8 rounded border border-border bg-surface text-ink-muted hover:border-accent-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Move round up">
              <IconChevronUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={onMoveDown} disabled={index === total - 1}
              className="inline-flex items-center justify-center h-8 w-8 rounded border border-border bg-surface text-ink-muted hover:border-accent-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Move round down">
              <IconChevronDown className="w-4 h-4" />
            </button>
            <button type="button" onClick={onRemove} disabled={total <= 1}
              className="inline-flex items-center justify-center h-8 w-8 rounded border border-border bg-surface text-wrong hover:border-wrong disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Remove round">
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ✅ NEW: Simple Toggle to Enable/Disable Sporcle Mode */}
      {!readOnly && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Game Type
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceCard
              active={!isSporcleMode}
              onClick={() => onUpdate({ mode: 'none' })}
              title="Standard"
              description="Solo play with lifelines & memory game."
              disabled={readOnly}
            />
            <ChoiceCard
              active={isSporcleMode}
              onClick={() => onUpdate({ mode: 'speed' })}
              title="Sporcle"
              description="Multiplayer scoring modes (Speed/Collect)."
              disabled={readOnly}
            />
          </div>
        </section>
      )}

      {/* ✅ CONDITIONAL: Only render SGS with sporcle variant when toggled ON */}
      <SharedGameSettings
        value={roundToConfig(round)}
        onChange={(next) => onUpdate(configToRound(next, round))}
        disabledTypes={disabledTypes}
        disabledReasons={disabledReasons}
        reversedClipsCount={reversedClipsCount}
        allowInstruments={true}
        readOnly={readOnly}
        
        // ✅ ONLY PASS SPORCLE VARIANT WHEN TOGGLED ON
        variant={isSporcleMode ? 'sporcle' : 'default'} 
        
        mode={round.mode || 'none'} 
        setMode={(v) => onUpdate({ mode: v })}
        
        showLifelines={!isSporcleMode}
      />
    </div>
  );
}