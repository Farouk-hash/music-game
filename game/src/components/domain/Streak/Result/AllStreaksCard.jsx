// game/src/routes/Streak/AllStreaksCard.tsx
import { BorderContainer } from '@/components/layout/BorderContainer';
import { IconDice, IconGenres, IconCheck, IconFire, IconCoin } from '@/icons';


export function AllStreaksCard({ streaks, isDefault, numericId }) {
  if (streaks.length <= 1) return null;

  return (
    <BorderContainer border="all" className="p-5 space-y-2">
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
        All streaks
      </p>
      <ul className="space-y-1.5">
        {streaks.map(s => {
          const isCurrent = isDefault ? s.is_default : Number(s.genre_id) === numericId;
          return (
            <li
              key={s.genre_id ?? 'default'}
              className={[
                'flex items-center justify-between px-3 py-2 rounded-md border text-sm',
                isCurrent ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2',
              ].join(' ')}
            >
              <span className="flex items-center gap-2 min-w-0">
                {/* Icon for Default / Genre */}
                {s.is_default ? (
                  <IconDice className="w-4 h-4 text-ink-muted shrink-0" />
                ) : (
                  <IconGenres className="w-4 h-4 text-ink-muted shrink-0" />
                )}
                
                <span className="truncate">
                  {s.is_default ? 'Default' : s.genre_name}
                </span>
                
                {/* Daily Attempted Check */}
                {s.daily_attempted && (
                  <IconCheck className="w-3.5 h-3.5 text-correct shrink-0" />
                )}
              </span>
              
              <span className="text-xs text-ink-subtle tabular-nums whitespace-nowrap ml-2 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <IconFire className="w-3.5 h-3.5 text-wrong" />
                  {s.current_streak}d
                </span>
                <span className="flex items-center gap-1">
                  <IconCoin className="w-3.5 h-3.5 text-highlight" />
                  {s.streak_points}p
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </BorderContainer>
  );
}