// admin/src/components/domain/Templates/RoundEditor.jsx
import { Button } from '../../ui/Button';
import { QuestionTypeGrid } from './QuestionTypeGrid';

const VALID_MODES = ['speed', 'collect'];
const VALID_ANSWER_MODES = ['choose', 'type'];
const VALID_INSTRUMENTS = ['none', 'mixed', 'all'];
const VALID_REVERSED_ANSWERS = ['no', 'some', 'all'];

export function RoundEditor({
  round, index, total, availableLevels,
  onUpdate, onRemove,
}) {
  return (
    <div className="border border-surface-border rounded-md p-4 space-y-4 bg-surface-subtle/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Round {index + 1}</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-muted">Level</label>
          <select
            value={round.level}
            onChange={e => onUpdate({ level: Number(e.target.value) })}
            className="h-8 px-2 rounded text-xs bg-surface-subtle border border-surface-border"
          >
            {availableLevels.map(lv => (
              <option key={lv} value={lv}>L{lv}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={total <= 1}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <label className="space-y-1">
          <span className="text-ink-muted">Mode</span>
          <select
            value={round.mode}
            onChange={e => onUpdate({ mode: e.target.value })}
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          >
            {VALID_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-ink-muted">Answer mode</span>
          <select
            value={round.answerMode}
            onChange={e => onUpdate({ answerMode: e.target.value })}
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          >
            {VALID_ANSWER_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-ink-muted">Rounds count</span>
          <input
            type="number"
            value={round.rounds}
            onChange={e => onUpdate({ rounds: Number(e.target.value) })}
            min={1}
            max={50}
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          />
        </label>

        <label className="space-y-1">
          <span className="text-ink-muted">Instruments</span>
          <select
            value={round.instruments}
            onChange={e => onUpdate({ instruments: e.target.value })}
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          >
            {VALID_INSTRUMENTS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-ink-muted">Reversed answers</span>
          <select
            value={round.reversedAnswers}
            onChange={e => onUpdate({ reversedAnswers: e.target.value })}
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          >
            {VALID_REVERSED_ANSWERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-ink-muted">Reversed audio</span>
          <select
            value={round.reversedAudio ? 'yes' : 'no'}
            onChange={e => onUpdate({ reversedAudio: e.target.value === 'yes' })}
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-ink-muted">Timer (sec)</span>
          <input
            type="number"
            value={round.timer ?? ''}
            onChange={e => onUpdate({
              timer: e.target.value === '' ? null : Number(e.target.value),
            })}
            min={5}
            max={300}
            placeholder="None"
            className="w-full h-8 px-2 rounded bg-surface-subtle border border-surface-border"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
          Question types
        </p>
        <QuestionTypeGrid
          value={round.questionTypes}
          onChange={next => onUpdate({ questionTypes: next })}
        />
      </div>
    </div>
  );
}