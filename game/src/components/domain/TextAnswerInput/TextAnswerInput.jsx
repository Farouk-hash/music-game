// game/src/components/game/TextAnswerInput.jsx
import { useState, useEffect } from 'react';
import { Button } from '../../ui/Button.jsx';

export function TextAnswerInput({
  onSubmit,
  revealed,
  userAnswer,
  correctLabel,
  correct,        // true | false | null
}) {
  const [value, setValue] = useState('');

  // Clear input when a new question starts (parent passes revealed=false)
  useEffect(() => {
    if (!revealed) setValue('');
  }, [revealed]);

  function handleSubmit(e) {
    e.preventDefault();
    if (revealed) return;
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  }

  const borderClass = !revealed
    ? 'border-border focus:border-accent'
    : correct
    ? 'border-correct'
    : 'border-wrong';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-[0.15em]">
        Your answer
      </label>

      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={revealed}
        placeholder="Type your answer…"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        dir="auto"
        className={[
          'w-full h-12 px-4 rounded-md',
          'bg-surface-2 text-ink placeholder:text-ink-subtle',
          'border focus:outline-none transition-colors',
          'disabled:opacity-80 disabled:cursor-not-allowed',
          borderClass,
        ].join(' ')}
      />

      {!revealed && (
        <div className="flex justify-end">
          <Button type="submit" disabled={!value.trim()}>
            Submit
          </Button>
        </div>
      )}

      {revealed && (
        <div className="space-y-2 pt-1">
          <div className="flex items-baseline gap-3 text-sm">
            <span className="text-ink-muted shrink-0">Your answer:</span>
            {userAnswer === '__TIMEOUT__' ? (
              <span className="text-wrong font-medium italic">
                ⏱ No answer — time's up
              </span>
            ) : (
              <span className={correct ? 'text-correct font-medium' : 'text-wrong font-medium'}>
                {userAnswer || '—'}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 text-sm">
            <span className="text-ink-muted shrink-0">Correct answer:</span>
            <span className="text-correct font-medium">{correctLabel}</span>
          </div>
        </div>
      )}
    </form>
  );
}