import { Link } from 'react-router-dom';
import { IconFire, IconCoin, IconChevronRight } from '@/icons';
import { useStreakList } from '@/hooks/streaks/useStreakList';

export function StreakBanner() {
    const { streaks, totalPoints } = useStreakList();
    const topStreak = streaks.reduce(
        (max, s) => (s.current_streak > (max?.current_streak ?? -1) ? s : max),
        null
    );
    return (
        <Link
        to="/streak"
        className="block rounded-md border border-accent bg-accent-soft p-4 hover:bg-accent transition-colors"
        >
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">
                Daily · Streaks
            </p>
            
            {streaks.length === 0 ? (
                <p className="text-lg font-bold text-ink flex items-center gap-1.5">
                Start your first streak
                <span className="text-accent ml-1"><IconChevronRight className='w-3.5 h-3.5 '/></span>
                </p>
            ) : (
                <>
                <p className="text-lg font-bold text-ink flex items-center gap-1.5 mt-0.5">
                    <IconFire className="w-5 h-5 text-wrong" />
                    {topStreak?.current_streak ?? 0} day{topStreak?.current_streak === 1 ? '' : 's'}
                    {streaks.length > 1 && (
                    <span className="ml-2 text-sm font-normal text-ink-muted">
                        (+{streaks.length - 1} more)
                    </span>
                    )}
                </p>
                <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5">
                    <IconCoin className="w-3.5 h-3.5 text-highlight" />
                    {totalPoints} pts · {streaks.length} active streak{streaks.length === 1 ? '' : 's'}
                </p>
                </>
            )}
            </div>
            <IconChevronRight className="w-6 h-6" />
        </div>
        </Link>
    );
}