import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { IconFire, IconBolt, IconCoin, IconTrash, IconDice, IconGenres, IconCheck, IconWifiOff } from '@/icons';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js'; // ✅ NEW

export function StreakCard({ 
  streak, 
  powerRemaining, 
  easyModeFailures,
  onPlay, 
  onAbandon 
}) {
  const isOnline = useNetworkStatus(); // ✅ Check network status
  
  const { 
    genre_name, 
    is_default, 
    current_streak, 
    longest_streak, 
    streak_points, 
    daily_attempted, 
    consecutive_failures 
  } = streak;

  const handleAbandon = (e) => {
    e.stopPropagation();
    if (!isOnline) return; // ✅ Prevent action if offline
    onAbandon();
  };

  const handlePlay = (e) => {
    e?.stopPropagation();
    if (!isOnline) return; // ✅ Prevent action if offline
    onPlay();
  };

  // Determine if actions are disabled
  const isDisabled = !isOnline;

  return (
    <BorderContainer
      border="all"
      className={`p-5 transition-colors ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-accent-2'}`}
      onClick={isDisabled ? undefined : handlePlay} // ✅ Disable click if offline
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase text-highlight flex items-center gap-1.5">
             {is_default ? (
              <>
                <IconDice className="w-4 h-4" />
                Default
              </>
            ) : (
              <>
                <IconGenres className="w-4 h-4" />
                {genre_name}
              </>
            )}
          </p>
          <p className="text-2xl font-bold mt-1 flex items-center gap-1.5">
            <IconFire className="w-6 h-6 text-wrong" />
            {current_streak} day{current_streak !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
            <IconCoin className="w-4 h-4 text-highlight" />
            {streak_points} pts · Best: {longest_streak}
            {consecutive_failures >= easyModeFailures && (
              <span className="ml-2 text-accent-2">🎯 Easy mode</span>
            )}
          </p>
          
          {/* ✅ Show offline indicator inline if needed */}
          {isDisabled && (
            <p className="text-[10px] text-wrong mt-1 flex items-center gap-1">
              <IconWifiOff className="w-3 h-3" /> Requires internet to play
            </p>
          )}
        </div>

        <div
          className="flex flex-row flex-wrap items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {daily_attempted ? (
            <span className={`text-xs flex items-center gap-1 ${isDisabled ? 'text-ink-subtle' : 'text-correct'}`}>
              <IconCheck className="w-4 h-4" /> Daily done
            </span>
          ) : (
            <Button 
              onClick={handlePlay} 
              disabled={isDisabled}
              variant={isDisabled ? 'ghost' : 'primary'}
            >
              {isDisabled ? 'Offline' : 'Play daily'}
            </Button>
          )}

          {powerRemaining > 0 && (
            <Button 
              variant="secondary" 
              onClick={handlePlay}
              disabled={isDisabled}
            >
              <IconBolt className="w-4 h-4 mr-1.5" />
              Power ({powerRemaining})
            </Button>
          )}

          {!is_default && (
            <button
              onClick={handleAbandon}
              disabled={isDisabled}
              className={`text-xs flex items-center gap-1 ml-1 transition-colors ${
                isDisabled 
                  ? 'text-ink-subtle cursor-not-allowed' 
                  : 'text-wrong hover:underline'
              }`}
            >
              <IconTrash className="w-3.5 h-3.5" />
              Abandon
            </button>
          )}
        </div>
      </div>
    </BorderContainer>
  );
}