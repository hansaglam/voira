import type { PracticeResult, UserLearningProfile } from '../../types/learning';
import { getLocalWeeklyWindow, isTimestampInWindow, localDateKey, selectWeeklyEligiblePractices } from '../weeklyReport';

export interface ProfileConsistencySnapshot {
  practicesThisWeek: number;
  daysPracticedThisWeek: number;
  currentStreak: number | null;
}

/**
 * Simple practice consistency — normal speaking attempts only.
 * Weak-word dedicated training must not inflate counts.
 */
export function buildProfileConsistencySnapshot(input: {
  profile: UserLearningProfile;
  practiceResults: PracticeResult[];
  nowMs?: number;
}): ProfileConsistencySnapshot {
  const results = selectWeeklyEligiblePractices(input.practiceResults);
  const nowMs = input.nowMs ?? Date.now();
  const window = getLocalWeeklyWindow(nowMs);
  const thisWeek = results.filter((result) => isTimestampInWindow(result.createdAt, window.currentStartMs, window.currentEndMs));

  const daySet = new Set<string>();
  for (const result of thisWeek) {
    const key = localDateKey(result.createdAt);
    if (key) daySet.add(key);
  }

  const streak =
    results.length > 0 && input.profile.currentStreak > 0
      ? input.profile.currentStreak
      : results.length > 0
        ? 0
        : null;

  return {
    practicesThisWeek: thisWeek.length,
    daysPracticedThisWeek: daySet.size,
    currentStreak: streak,
  };
}
