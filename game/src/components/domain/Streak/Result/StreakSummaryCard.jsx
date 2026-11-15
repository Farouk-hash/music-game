// game/src/routes/Streak/StreakSummaryCard.tsx
import { BorderContainer } from '@/components/layout/BorderContainer';
import { 
  IconFire, 
  IconCoin, 
  IconDice, 
  IconGenres,
  IconBolt
} from '@/icons';


export function StreakSummaryCard({ streak, totalPoints, easyMode }) {
  return (
    <BorderContainer border="all" className="p-8 sm:p-10 text-center space-y-4">
      <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
        {streak.is_default ? (
          <>
            <IconDice className="w-4 h-4" />
            Default
          </>
        ) : (
          <>
            <IconGenres className="w-4 h-4" />
            {streak.genre_name}
          </>
        )}
      </p>

      {/* Replaced emoji with IconFire */}
      <div className="flex justify-center py-2">
        <IconFire className="w-16 h-16 text-wrong" />
      </div>

      <p className="text-3xl font-bold text-ink">
        {streak.current_streak} day{streak.current_streak === 1 ? '' : 's'}
      </p>

      {streak.longest_streak > streak.current_streak && (
        <p className="text-xs text-ink-subtle">
          Personal best: {streak.longest_streak} days
        </p>
      )}

      {/* Replaced emoji with IconCoin */}
      <p className="text-sm text-ink-muted flex items-center justify-center gap-1.5">
        <IconCoin className="w-4 h-4 text-highlight" />
        {streak.streak_points} pts this streak
      </p>

      <p className="text-xs text-ink-subtle">
        Total: {totalPoints} pts
      </p>

      {easyMode && (
        <p className="text-xs text-accent-2 pt-2 flex items-center justify-center gap-1.5">
          <IconBolt className="w-4 h-4" />
          Easy mode active — next challenge is a warmup
        </p>
      )}
    </BorderContainer>
  );
}