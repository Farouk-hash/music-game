// game/src/routes/Streak/Result.jsx
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/profiles/useProfile.js';
import { streakApi } from '@/lib/streakApi.js';
import { useChallengeConfig } from '@/context/ChallengeConfigContext';
import { BorderContainer } from '@/components/layout/BorderContainer.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Loader } from '@/components/ui/Loader.jsx';
import { StreakSummaryCard } from '@/components/domain/Streak/Result/StreakSummaryCard.jsx';
import { PowerCard } from '@/components/domain/Streak/Result/PowerCard.jsx';
import { AllStreaksCard } from '@/components/domain/Streak/Result/AllStreaksCard';

export default function StreakResult() {
  const navigate = useNavigate();
  const { genreKey } = useParams();
  const { id: profileId } = useProfile();
  const qc = useQueryClient();
  const config = useChallengeConfig();
  const today = new Date().toISOString().slice(0, 10);

  const urlKey = genreKey ?? 'default';
  const isDefault = urlKey === 'default';
  const numericId = isDefault ? null : Number(urlKey);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['streaks', 'list', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      return await streakApi.list(profileId);
    },
    enabled: !!profileId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const grantBonusMutation = useMutation({
    mutationFn: () => streakApi.grantBonus(today, profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['streaks'] });
    },
  });

  if (isLoading || isFetching) return <Loader variant="page" label="Loading result…" />;

  if (error) {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-wrong">{error.message}</p>
        <Button onClick={() => navigate('/streak')}>Back to streaks</Button>
      </BorderContainer>
    );
  }

  if (!data) return <Loader variant="page" label="Loading result…" />;

  const streaks = data.streaks ?? [];
  const streak = isDefault
    ? streaks.find(s => s.is_default || s.genre_id == null)
    : streaks.find(s => Number(s.genre_id) === numericId);

  if (!streak) {
    return (
      <BorderContainer border="all" className="p-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-ink-muted">{isDefault ? 'Default streak' : 'This streak'} no longer exists.</p>
        <Button onClick={() => navigate('/streak')}>Back to streaks</Button>
      </BorderContainer>
    );
  }

  const totalPoints = data.total_points ?? 0;
  const power = data.power ?? {
    used: 0,
    limit: config.powerAttemptsPerDay,
    remaining: config.powerAttemptsPerDay,
    bonus: 0,
    max_bonus: config.maxBonusPower,
  };

  const maxBonus = power.max_bonus ?? config.maxBonusPower;
  const easyMode = (streak.consecutive_failures ?? 0) >= config.easyModeFailures;

  return (
    <div className="max-w-lg mx-auto pb-24 px-1 min-h-screen">
      <div className="space-y-6 pt-12">

        <StreakSummaryCard
          streak={streak}
          totalPoints={totalPoints}
          easyMode={easyMode}
        />

        <PowerCard
          power={power}
          maxBonus={maxBonus}
          urlKey={urlKey}
          isGranting={grantBonusMutation.isPending}
          onPlayPower={() => navigate(`/streak/play/${urlKey}`)}
          onWatchAd={() => grantBonusMutation.mutate()}
        />

        <AllStreaksCard
          streaks={streaks}
          isDefault={isDefault}
          numericId={numericId}
        />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/streak')} className="flex-1">
            ← Back to streaks
          </Button>
          <Button variant="secondary" onClick={() => navigate('/setup')} className="flex-1">
            Setup
          </Button>
        </div>
      </div>
    </div>
  );
}