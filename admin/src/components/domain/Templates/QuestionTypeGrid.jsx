// admin/src/components/domain/Templates/QuestionTypeGrid.jsx
const ALL_TYPES = [
  { value: 'name-track',    label: 'Track name',      hint: 'Which song is this?' },
  { value: 'name-artist',   label: 'Artist name',     hint: 'Who sings it?' },
  { value: 'name-album',    label: 'Album name',      hint: 'Which album?' },
  { value: 'name-featured', label: 'Featured artist', hint: 'Who is featured?' },
  { value: 'name-position', label: 'Clip position',   hint: 'Start / middle / end?' },
  { value: 'lyrics-track',  label: 'Lyrics — track',  hint: 'Which song from these lyrics?' },
  { value: 'lyrics-artist', label: 'Lyrics — artist', hint: 'Who sings these lyrics?' },
  { value: 'lyrics-album',  label: 'Lyrics — album',  hint: 'Which album are these lyrics from?' },
];

export function QuestionTypeGrid({ value, onChange }) {
  const selected = new Set(value);

  function toggle(slug) {
    const next = selected.has(slug)
      ? value.filter(v => v !== slug)
      : [...value, slug];
    onChange(next);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ALL_TYPES.map(opt => {
        const active = selected.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={[
              'text-left px-3 py-2 rounded-md border transition-colors',
              active
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-surface-subtle text-ink-muted border-surface-border hover:border-brand-500 hover:text-ink',
            ].join(' ')}
          >
            <p className="text-sm font-medium flex items-center gap-1.5">
              {active && <span aria-hidden="true">✓</span>}
              {opt.label}
            </p>
            <p className="text-[11px] mt-0.5 opacity-80">{opt.hint}</p>
          </button>
        );
      })}
    </div>
  );
}