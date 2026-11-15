// game/src/components/domain/Setup/QuestionTypePicker/QuestionTypePicker.jsx
import { ALL_TYPES } from "@/constants";
import { HeartButton } from "../../Profile/HeartButton";
import { useFavoriteToggles } from '@/hooks/setup/useFavoriteToggles.js';
import { DISABLED_HINTS } from "@/constants/questionTypes";

const ALL_VALUES = ALL_TYPES.map(t => t.value);

export function QuestionTypePicker({
  value = [],
  onChange,
  disabledTypes = new Set(),
  disabledReasons,
  disabled = false,
  onUnfavorited,
}) {
  const { isQuestionTypeFavorite, toggleQuestionType } = useFavoriteToggles();

  const availableValues = ALL_VALUES.filter(v => !disabledTypes.has(v));

  const allSelected =
    availableValues.length > 0 &&
    availableValues.every(v => value.includes(v)) &&
    value.every(v => availableValues.includes(v));

  function toggle(type) {
    if (disabled || disabledTypes.has(type)) return;
    const next = value.includes(type)
      ? value.filter(v => v !== type)
      : [...value, type];
    onChange(next);
  }

  function chooseAll() {
    if (disabled) return;
    if (allSelected) onChange([]);
    else onChange([...availableValues]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={chooseAll}
          disabled={disabled || availableValues.length === 0}
          aria-pressed={allSelected}
          className={[
            'rounded-md border px-4 py-3 text-left transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            allSelected
              ? 'bg-accent text-bg border-accent'
              : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
          ].join(' ')}
        >
          <p className="text-sm font-semibold">Mixed (all)</p>
          <p className="text-xs mt-0.5 opacity-80">
            {availableValues.length < ALL_VALUES.length
              ? `Uses the ${availableValues.length} available types`
              : 'Cycles through everything'}
          </p>
        </button>

        {ALL_TYPES.map((opt) => {
          // 1. Visually "unavailable" if it's in disabledTypes
          const isUnavailable = disabledTypes.has(opt.value);
          
          // 2. Can click only if not disabled (readOnly) and not unavailable
          const canClick = !disabled && !isUnavailable;
          
          // 3. Selected only if it's in the value array
          const selected = value.includes(opt.value);
          
          const favourite = isQuestionTypeFavorite(opt.value);
          const reason = disabledReasons?.get(opt.value) ?? DISABLED_HINTS[opt.value] ?? 'Not available.';
          
          return (
            <div
              key={opt.value}
              className={[
                'relative rounded-md border transition-colors',
                selected
                  ? 'bg-accent-soft border-accent text-ink'
                  : 'bg-surface-2 border-border text-ink-muted',
                // Apply "unavailable" visual style if it's missing data
                isUnavailable ? 'opacity-40 cursor-not-allowed' : '',
                // Apply "read-only" visual style (slightly muted but not greyed)
                disabled && !isUnavailable ? 'opacity-80 cursor-default' : '',
                // Hover only if clickable
                canClick && !selected ? 'hover:border-accent-2 hover:text-ink' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                disabled={!canClick}
                aria-pressed={selected}
                title={isUnavailable ? reason : undefined}
                className="w-full text-left px-4 py-3 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-semibold flex items-center gap-1.5 pr-8">
                  {selected && <span aria-hidden="true">✓</span>}
                  {opt.label}
                </p>
                <p className="text-xs mt-0.5 opacity-80 pr-8">
                  {isUnavailable ? reason : opt.hint}
                </p>
              </button>

              <div className="absolute top-2 right-2">
                <HeartButton
                  variant="chip"
                  active={favourite}
                  onClick={async () => {
                    try {
                      await toggleQuestionType(opt.value);
                      if (favourite) onUnfavorited?.(opt.value);
                    } catch {}
                  }}
                  label={
                    favourite
                      ? 'Remove question type from favourites'
                      : 'Add question type to favourites'
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {value.length === 0 && availableValues.length > 0 && (
        <p className="text-xs text-ink-subtle">
          No types selected — all question types will be used.
        </p>
      )}

      {availableValues.length === 0 && (
        <p className="text-xs text-wrong">
          No question types available with the current filters. Select more artists to enable the Artist types.
        </p>
      )}
    </div>
  );
}