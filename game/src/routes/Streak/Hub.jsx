// game/src/routes/Streak/Hub.jsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStreakList } from '@/hooks/streaks/useStreakList';
import { useCatalog } from '@/hooks/setup/useCatalog';
import { useChallengeConfig } from '@/context/ChallengeConfigContext';
import { Button } from '@/components/ui/Button.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { GenreTileGrid } from '@/components/domain/Setup/Genres/GenreTileGrid.jsx';
import { IconPlus } from '@/icons';
import { WarningModal } from '@/components/Modal/WarningModal.jsx';

// Components
import { Onboarding } from '@/components/domain/Streak/Hub/Onboarding.jsx';
import { StreakCard } from '@/components/domain/Streak/Hub/StreakCard.jsx';
import { PowerStatus } from '@/components/domain/Streak/Hub/PowerStatus.jsx';

export default function StreakHub() {
  const navigate = useNavigate();
  const config = useChallengeConfig();
  const maxStreaks = config.maxActiveStreaks;
  
  const {
    streaks, totalPoints, power, loading, error,
    startStreak, abandonStreak,
    grantBonus, grantingBonus,
  } = useStreakList();
  
  const { data: catalog } = useCatalog();
  const genres = catalog?.genres ?? [];

  const [picking, setPicking] = useState(false);
  const [abandonTarget, setAbandonTarget] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // 1. Calculate which genres are already active in streaks
  const activeStreakGenreIds = useMemo(() => {
    return new Set(
      streaks
        .map(s => s.genre_id)
        .filter((id) => id !== null)
    );
  }, [streaks]);

  if (loading) return <Loader variant="page" label="Loading streaks…" />;
  if (error) {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-wrong">{error.message}</p>
        <Button onClick={() => navigate('/setup')}>Back to setup</Button>
      </BorderContainer>
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
                  >
                    <IconPlus className="w-5 h-5 mr-2"/> 
                    Start another streak ({maxStreaks - streaks.length} left)
                  </Button>
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
              selectedIds={activeStreakGenreIds} // 2. Pass the active streak genres here
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