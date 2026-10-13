// game/src/components/domain/Setup/QuestionTypePicker/QuestionTypePicker.jsx
import { HeartButton } from '../../Profile/HeartButton.jsx';
import { useFavoriteToggles } from '../../../../hooks/setup/useFavoriteToggles.js';

const ALL_TYPES = [
  { value: 'name-track',    label: 'Track name',      hint: 'What is the song?' },
  { value: 'name-artist',   label: 'Artist name',     hint: 'Who made it?' },
  { value: 'name-album',    label: 'Album name',      hint: 'What album is it from?' },
  { value: 'name-featured', label: 'Featured artist', hint: 'Who is featured?' },
  { value: 'name-position', label: 'Clip position',   hint: 'Start, middle, or end?' },
  { value: 'lyrics-track',  label: 'Lyric → track',   hint: 'Read the lyric, name the song' },
  { value: 'lyrics-artist', label: 'Lyric → artist',  hint: 'Read the lyric, name the singer' },
  { value: 'lyrics-album',  label: 'Lyric → album',   hint: 'Read the lyric, name the album' },
];

const ALL_VALUES = ALL_TYPES.map(t => t.value);

const DISABLED_HINTS = {
  'name-artist':   'Needs at least 2 selected artists.',
  'lyrics-artist': 'Needs at least 2 selected artists.',
};

export function QuestionTypePicker({
    value = [],
  onChange,
  disabledTypes = new Set(),
  onUnfavorited,
}) {
  const { isQuestionTypeFavorite, toggleQuestionType } = useFavoriteToggles();

  const availableValues = ALL_VALUES.filter(v => !disabledTypes.has(v));

  const allSelected =
    availableValues.length > 0 &&
    availableValues.every(v => value.includes(v)) &&
    value.every(v => availableValues.includes(v));

  function toggle(type) {
    if (disabledTypes.has(type)) return;
    const next = value.includes(type)
      ? value.filter(v => v !== type)
      : [...value, type];
    onChange(next);
  }

  function chooseAll() {
    if (allSelected) onChange([]);
    else onChange([...availableValues]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
        {/* Mixed preset */}
        <button
          type="button"
          onClick={chooseAll}
          disabled={availableValues.length === 0}
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

        {/* Individual types */}
        {ALL_TYPES.map((opt) => {
          const disabled = disabledTypes.has(opt.value);
          const selected = !disabled && value.includes(opt.value);
          const favourite = isQuestionTypeFavorite(opt.value);
          return (
            <div
              key={opt.value}
              className={[
                'relative rounded-md border transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                selected
                  ? 'bg-accent-soft border-accent text-ink'
                  : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2 hover:text-ink',
                disabled ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                disabled={disabled}
                aria-pressed={selected}
                title={disabled ? DISABLED_HINTS[opt.value] : undefined}
                className="w-full text-left px-4 py-3 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-semibold flex items-center gap-1.5 pr-8">
                  {selected && <span aria-hidden="true">✓</span>}
                  {opt.label}
                </p>
                <p className="text-xs mt-0.5 opacity-80 pr-8">
                  {disabled ? DISABLED_HINTS[opt.value] : opt.hint}
                </p>
              </button>

              {/* Heart — absolutely positioned top-right */}
              <div className="absolute top-2 right-2">
                
                <HeartButton
                  variant="chip"
                  active={favourite}
                  onClick={async () => {
                    try {
                      await toggleQuestionType(opt.value);
                      if (favourite) onUnfavorited?.(opt.value);
                    } catch {
                      // ignore                    
                  }}}
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