// game/src/context/ChallengeConfigContext.jsx
import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { streakApi } from '../lib/streakApi.js';

// 1. THE FALLBACK (Only used if the server request fails)
const FALLBACK_CONFIG = {
  powerAttemptsPerDay: 3,
  maxBonusPower: 3,
  maxActiveStreaks: 3,
  pointsPerCorrect: 2,
  pointsPerCorrectPower: 1,
  dailyPassBonus: 5,
  powerPassBonus: 2,
  defaultGenreMultiplier: 1.5,
  maxTotalQuestions: 30,
  baseTotalQuestions: 6,
  perDayMultiplier: 2,
  easyModeTotalQuestions: 6,
  easyModeFailures: 3,
  earlyBatches: 2,
  lateBatches: 12,
  minQuestionsPerBatch: 2,
  maxQuestionsPerBatch: 3,
};

export const DEFAULT_POWER = {
  used: 0,
  limit: FALLBACK_CONFIG.powerAttemptsPerDay,
  remaining: FALLBACK_CONFIG.powerAttemptsPerDay,
  bonus: 0,
  max_bonus: FALLBACK_CONFIG.maxBonusPower,
  base_limit: FALLBACK_CONFIG.powerAttemptsPerDay,
};

// 2. THE CONTEXT
const ChallengeConfigContext = createContext(FALLBACK_CONFIG);

// 3. THE PROVIDER
export function ChallengeConfigProvider({ children }) {
  const { data } = useQuery({
    queryKey: ['streak', 'config'],
    queryFn: async () => {
      const res = await streakApi.config();
      return res?.config ?? FALLBACK_CONFIG;
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
    refetchOnWindowFocus: false,
  });

  return (
    <ChallengeConfigContext.Provider value={data ?? FALLBACK_CONFIG}>
      {children}
    </ChallengeConfigContext.Provider>
  );
}

// 4. THE HOOK
export function useChallengeConfig() {
  return useContext(ChallengeConfigContext);
}