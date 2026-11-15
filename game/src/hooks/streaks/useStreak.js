// game/src/hooks/streaks/useStreak.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streakApi, todayIso } from '../../lib/streakApi.js';
import { useProfile } from '../profiles/useProfile.js';
import { DEFAULT_POWER, useChallengeConfig } from '@/context/ChallengeConfigContext.jsx';

export function useStreak({ genreId = null } = {}) {
  const { id: profileId } = useProfile();
  const qc = useQueryClient();
  const today = todayIso();
  const config = useChallengeConfig();

  const challengeQuery = useQuery({
    queryKey: ['streaks', 'challenge', today, genreId],
    queryFn: async () => {
      const data = await streakApi.challenge(today, genreId);
      if (!data.ok) throw new Error(data.error);
      return data.challenge;
    },
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const listQuery = useQuery({
    queryKey: ['streaks', 'list', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      return await streakApi.list(profileId);
    },
    enabled: !!profileId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const currentStreak = listQuery.data?.streaks?.find(s => s.genre_id === genreId) ?? null;

  const submitMutation = useMutation({
    mutationFn: async ({ correctCount, totalCount, batchesDone, passed, mode }) => {
      const data = await streakApi.submit(today, {
        profileId, genre_id: genreId,
        correct_count: correctCount, total_count: totalCount,
        batches_done: batchesDone, passed, mode,
      });
      if (!data.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['streaks'] });
    },
  });

  const grantBonusMutation = useMutation({
    mutationFn: async () => {
      const data = await streakApi.grantBonus(today, profileId);
      if (!data.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['streaks'] });
    },
  });

  const streakDay = currentStreak?.current_streak ?? 0;
  const consecutiveFailures = currentStreak?.consecutive_failures ?? 0;
  const dailyAttempted = currentStreak?.daily_attempted ?? false;

  // ── Math from config (no hardcoded numbers) ──
  const easyMode = consecutiveFailures >= config.easyModeFailures;
  const totalBatches = easyMode
    ? config.earlyBatches
    : Math.min(streakDay + config.earlyBatches, config.lateBatches);

  const maxTotalQuestions = easyMode
    ? config.easyModeTotalQuestions
    : Math.min(
        config.baseTotalQuestions + streakDay * config.perDayMultiplier,
        config.maxTotalQuestions
      );

  const questionsPerBatch = easyMode
    ? Math.max(config.minQuestionsPerBatch, Math.min(
        config.maxQuestionsPerBatch,
        Math.floor(maxTotalQuestions / totalBatches)
      ))
    : Math.max(config.minQuestionsPerBatch, Math.min(
        config.maxQuestionsPerBatch,
        Math.floor(maxTotalQuestions / totalBatches)
      ));

  // Power
  const power = listQuery.data?.power ??DEFAULT_POWER;

  return {
    challenge: challengeQuery.data ?? null,
    streak: currentStreak,
    power,
    dailyAttempted,
    loading: challengeQuery.isLoading || listQuery.isLoading,
    error: challengeQuery.error || listQuery.error,
    streakDay,
    consecutiveFailures,
    easyMode,
    totalBatches,
    questionsPerBatch,
    config,
    submit: submitMutation.mutateAsync,
    submitting: submitMutation.isPending,
    grantBonus: grantBonusMutation.mutateAsync,
    grantingBonus: grantBonusMutation.isPending,
  };
}