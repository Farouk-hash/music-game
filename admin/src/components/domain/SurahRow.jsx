// src/components/domain/SurahRow.jsx
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';

export function SurahRow({
  surah,
  onPlay,
  selectable = true,
  selected = false,
  onToggleSelect,
  isPlaying = false,
  showMoshaf = true,
  clipCount = 0,                  // ← NEW
}) {
  function handlePlay(e) {
    e.stopPropagation();
    onPlay?.(surah);
  }

  function handleToggle(e) {
    e.stopPropagation();
    onToggleSelect?.(surah.id);
  }

  return (
    <li className={`
      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group
      ${selected ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : 'hover:bg-surface-subtle'}
    `}>
      {selectable && (
        <Checkbox
          checked={selected}
          onChange={handleToggle}
          className="shrink-0"
        />
      )}

      <button
        type="button"
        onClick={handlePlay}
        disabled={!surah.src}
        aria-label={`Play ${surah.name}`}
        className={`
          w-8 h-8 shrink-0 rounded-full
          flex items-center justify-center
          transition-colors
          ${isPlaying
            ? 'bg-brand-500 text-white'
            : 'bg-surface-subtle text-ink-muted group-hover:bg-brand-500 group-hover:text-white'}
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {isPlaying ? (
          <span aria-hidden="true" className="text-xs">■</span>
        ) : (
          <span aria-hidden="true" className="text-xs">▶</span>
        )}
      </button>

      <span className="w-10 text-right text-xs text-ink-subtle tabular-nums shrink-0">
        {String(surah.number).padStart(3, '0')}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-ink truncate" title={surah.name}>
            {surah.name}
          </p>
          {clipCount > 0 && (
            <Badge variant="success" size="sm">
              ✓ {clipCount} {clipCount === 1 ? 'clip' : 'clips'}
            </Badge>
          )}
        </div>
        {showMoshaf && surah.moshafName && (
          <p className="text-xs text-ink-muted truncate">{surah.moshafName}</p>
        )}
      </div>

      <span className="text-xs text-ink-subtle tabular-nums shrink-0 w-12 text-right">
        —
      </span>
    </li>
  );
}