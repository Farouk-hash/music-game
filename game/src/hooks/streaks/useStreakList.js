// game/src/hooks/streaks/useStreakList.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streakApi, todayIso } from '../../lib/streakApi.js';
import { useProfile } from '../profiles/useProfile.js';
import { DEFAULT_POWER, useChallengeConfig } from '@/context/ChallengeConfigContext.jsx';

export function useStreakList() {
  const { id: profileId } = useProfile();
  const qc = useQueryClient();
  const today = todayIso();
  const config = useChallengeConfig();

  const query = useQuery({
    queryKey: ['streaks', 'list', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      return await streakApi.list(profileId);
    },
    enabled: !!profileId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const startMutation = useMutation({
    mutationFn: ({ genreId }) => streakApi.start(profileId, genreId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['streaks'] }),
  });

  const abandonMutation = useMutation({
    mutationFn: ({ genreId }) => streakApi.abandon(profileId, genreId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['streaks'] }),
  });

  const grantBonusMutation = useMutation({
    mutationFn: () => streakApi.grantBonus(today, profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['streaks'] }),
  });

  return {
    streaks: query.data?.streaks ?? [],
    totalPoints: query.data?.total_points ?? 0,
    power: query.data?.power ??DEFAULT_POWER,
    loading: query.isLoading,
    error: query.error,
    startStreak: (genreId) => startMutation.mutateAsync({ genreId }),
    abandonStreak: (genreId) => abandonMutation.mutateAsync({ genreId }),
    grantBonus: () => grantBonusMutation.mutateAsync(),
    starting: startMutation.isPending,
    abandoning: abandonMutation.isPending,
    grantingBonus: grantBonusMutation.isPending,
  };
}