import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { IconWifiOff } from '@/icons/index.js'; // ✅ Import for offline indicator

export function ChallengePreview({
  challenge,
  streak,
  power,
  streakDay,
  consecutiveFailures,
  easyMode,
  totalBatches,
  questionsPerBatch,
  dailyAttempted,
  fetchingQuestions,
  grantingBonus,
  onStart,
  onWatchAd,
  online = true, // ✅ NEW PROP: Network status from parent
}) {
  const powerRemaining = power?.remaining ?? 0;
  const canPlayPower = powerRemaining > 0 && online;
  const bonusAtCap = (power?.bonus ?? 0) >= 3;
  
  // ✅ Daily is disabled if attempted, fetching, OR offline
  const dailyDisabled = !online || dailyAttempted || fetchingQuestions;

  return (
    <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen">
      <div className="space-y-6 pt-8">

        {/* Easy mode banner */}
        {easyMode && (
          <div className="rounded-md border border-accent-2 bg-accent-soft p-4 text-center space-y-1">
            <p className="text-xs font-semibold text-accent-2 uppercase tracking-[0.15em]">
              🎯 Easy mode
            </p>
            <p className="text-xs text-ink-muted">
              {consecutiveFailures} rough days in a row. Let's warm up.
            </p>
          </div>
        )}

  
        {/* Daily card */}
        <BorderContainer 
          border="all" 
          className={`p-8 sm:p-10 text-center space-y-4 transition-opacity ${!online ? 'opacity-60' : ''}`}
        >
          <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
            Today · {challenge.challenge_date}
          </p>
          <p className="text-2xl font-bold text-ink" dir="rtl">
            {challenge.genre_name}
          </p>
          <p className="text-sm text-ink-muted" dir="rtl">
            {challenge.artist_names.join(' · ')}
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-xs text-ink-subtle">
            <span>🔥 {streakDay} day{streakDay === 1 ? '' : 's'}</span>
            <span>💰 {streak?.streak_points ?? 0} pts</span>
          </div>
          <p className="text-sm text-ink-muted pt-2">
            {totalBatches} batches · {totalBatches * questionsPerBatch} questions
          </p>
          
          <Button
            onClick={() => online && onStart('daily')}
            disabled={dailyDisabled}
            className="w-full mt-4"
          >
            {!online ? (
              <span className="inline-flex items-center gap-2">
                <IconWifiOff className="w-4 h-4" /> Offline
              </span>
            ) : dailyAttempted ? (
              '✓ Daily complete — come back tomorrow'
            ) : fetchingQuestions ? (
              'Loading…'
            ) : (
              'Start daily challenge'
            )}
          </Button>
        </BorderContainer>

        {/* Power card */}
        <BorderContainer 
          border="all" 
          className={`p-6 space-y-3 transition-opacity ${!online ? 'opacity-60' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-highlight">
                Power play
              </p>
              <p className="text-sm text-ink-muted mt-1">
                {powerRemaining} / {power?.limit ?? 3} attempts left today
              </p>
            </div>
            <span className="text-2xl">⚡</span>
          </div>
          
          {/* ✅ Primary Action Button */}
          <Button
            variant="secondary"
            onClick={() => online && onStart('power')}
            disabled={!canPlayPower || fetchingQuestions || !online} // ✅ Explicitly disable when offline
            className="w-full"
          >
            {!online ? (
              <span className="inline-flex items-center gap-2">
                <IconWifiOff className="w-4 h-4" /> Offline
              </span>
            ) : canPlayPower ? (
              `Play power (${powerRemaining} left)`
            ) : (
              'Out of power attempts'
            )}
          </Button>
          
          {/* ✅ Secondary Ad Button - ONLY show if online AND out of power AND under cap */}
          {!online ? null : !canPlayPower && !bonusAtCap && (
            <Button
              variant="secondary"
              onClick={onWatchAd} // ✅ No need for online guard here since parent condition handles it
              disabled={grantingBonus}
              className="w-full text-xs"
            >
              {grantingBonus ? (
                'Granting…'
              ) : (
                '🎬 Watch a video for +1 attempt'
              )}
            </Button>
          )}
          
          {/* ✅ Bonus Cap Message - Only relevant when online or viewing cached state */}
          {bonusAtCap && (
            <p className="text-center text-xs text-ink-subtle">
              Bonus limit reached for today
            </p>
          )}
        </BorderContainer>

      </div>
    </div>
  );
}