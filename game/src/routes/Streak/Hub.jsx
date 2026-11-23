// game/src/routes/Streak/Hub.jsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStreakList } from '@/hooks/streaks/useStreakList';
import { useCatalog } from '@/hooks/setup/useCatalog';
import { useChallengeConfig } from '@/context/ChallengeConfigContext';
import { Button } from '@/components/ui/Button.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { GenreTileGrid } from '@/components/domain/Setup/Genres/GenreTileGrid.jsx';
import { IconPlus, IconWifiOff } from '@/icons';
import { WarningModal } from '@/components/Modal/WarningModal.jsx';
import { OfflineBlock } from '@/components/network/OfflineBlock.jsx';
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js';

// Components
import { Onboarding } from '@/components/domain/Streak/Hub/Onboarding.jsx';
import { StreakCard } from '@/components/domain/Streak/Hub/StreakCard.jsx';
import { PowerStatus } from '@/components/domain/Streak/Hub/PowerStatus.jsx';

export default function StreakHub() {
  const navigate = useNavigate();
  const config = useChallengeConfig();
  const maxStreaks = config.maxActiveStreaks;
  const isOnline = useNetworkStatus();

  const {
    streaks, totalPoints, power, loading, error,
    startStreak, abandonStreak,
    grantBonus, grantingBonus, refetch,
  } = useStreakList();

  const { data: catalog } = useCatalog();
  const genres = catalog?.genres ?? [];

  const [picking, setPicking] = useState(false);
  const [abandonTarget, setAbandonTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const activeStreakGenreIds = useMemo(() => {
    return new Set(
      streaks
        .map(s => s.genre_id)
        .filter((id) => id !== null)
    );
  }, [streaks]);

  // Offline with nothing loaded. NOTE: while offline a query is *paused*, so
  // `loading` (isLoading) is false and `streaks` is empty. Checking `loading`
  // here would never match and the page would show the "start your first
  // streak" onboarding, which is wrong: we simply have no data.
  if (!isOnline && streaks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen pt-8">
        <OfflineBlock
          variant="page"
          title="No Connection"
          subtitle="Your streak history is stored online. Please reconnect to view or manage your daily challenges."
          onRetry={() => { if (navigator.onLine) refetch?.(); }}
          showSetupLink={false}
          icon={<IconWifiOff className="w-8 h-8 text-wrong mb-2" />}
        />
      </div>
    );
  }

  if (loading) return <Loader variant="page" label="Loading streaks…" />;

  // API errors (e.g. server down while online)
  if (error) {
    return (
      <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen pt-8">
        <OfflineBlock
          variant="page"
          title="Unable to load streaks"
          subtitle={error.message || "Something went wrong while fetching your progress."}
          onRetry={() => refetch?.()}
          showSetupLink={true}
          icon={<IconWifiOff className="w-8 h-8 text-wrong mb-2" />}
        />
      </div>
    );
  }

  async function handleStart(genreId) {
    try {
      await startStreak(genreId);
      setPicking(false);
    } catch (e) {
      setErrorMessage(e.message);
    }
  }

  async function handleWatchAd() {
    try {
      await grantBonus();
    } catch (e) {
      setErrorMessage(e.message);
    }
  }

  async function confirmAbandon() {
    if (!abandonTarget) return;
    try {
      await abandonStreak(abandonTarget.id);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setAbandonTarget(null);
    }
  }

  const maxBonus = power.max_bonus ?? config.maxBonusPower;
  const outOfPower = power.remaining === 0;
  const canWatchVideo = outOfPower && power.bonus < maxBonus;

  return (
    <div className="max-w-2xl mx-auto pb-24 px-1 min-h-screen">
      <div className="space-y-4 pt-8">

        {/* Offline but we still have data in memory: show it, read-only. */}
        {!isOnline && streaks.length > 0 && (
          <OfflineBlock
            variant="banner"
            title="Viewing Cached Data"
            subtitle="Starting, abandoning and playing streaks require an internet connection."
            onRetry={null}
            icon={<IconWifiOff className="w-5 h-5" />}
          />
        )}

        {streaks.length === 0 ? (
          <Onboarding
            maxStreaks={maxStreaks}
            onStart={handleStart}
            onPickGenre={() => setPicking(true)}
          />
        ) : (
          <>
            <PowerStatus
              totalPoints={totalPoints}
              power={power}
              maxBonus={maxBonus}
              canWatchVideo={canWatchVideo}
              grantingBonus={grantingBonus}
              onWatchAd={handleWatchAd}
            />

            {streaks.map(s => (
              <StreakCard
                key={s.genre_id ?? 'default'}
                streak={s}
                powerRemaining={power.remaining}
                easyModeFailures={config.easyModeFailures}
                onPlay={() => navigate(`/streak/play/${s.genre_id ?? 'default'}`)}
                onAbandon={() => setAbandonTarget({
                  id: s.genre_id,
                  name: s.is_default ? 'Default' : s.genre_name
                })}
              />
            ))}

            {streaks.length < maxStreaks && (
              <div className="p-4">
                <Button
                  variant="secondary"
                  onClick={() => setPicking(!picking)}
                  className="w-full"
                  disabled={!isOnline}
                >
                  <IconPlus className="w-5 h-5 mr-2"/>
                  Start another streak ({maxStreaks - streaks.length} left)
                </Button>
                {!isOnline && (
                  <p className="text-xs text-center text-ink-muted mt-2">
                    Requires internet connection
                  </p>
                )}
              </div>
            )}

            {streaks.length >= maxStreaks && (
              <div className="p-4 text-center">
                <p className="text-xs text-ink-subtle">
                  Max {maxStreaks} streaks. Abandon one to start another.
                </p>
              </div>
            )}

          </>
        )}

        {picking && (
          <div className="pt-4">
            <GenreTileGrid
              genres={genres}
              selectedIds={activeStreakGenreIds}
              onToggle={handleStart}
              view="grid"
            />
          </div>
        )}
      </div>

      <WarningModal
        open={!!abandonTarget}
        onClose={() => setAbandonTarget(null)}
        onConfirm={confirmAbandon}
        title="Abandon streak?"
        description={abandonTarget ? `"${abandonTarget.name}" will be stopped. You keep your points, but the streak will be broken.` : ''}
        confirmLabel="Abandon"
        cancelLabel="Keep playing"
        showCancel
      />

      <WarningModal
        open={!!errorMessage}
        onClose={() => setErrorMessage(null)}
        onConfirm={() => setErrorMessage(null)}
        title="Oops"
        description={errorMessage}
        confirmLabel="Got it"
      />
    </div>
  );
}