import type { PracticeResult, UserLearningProfile } from '../../types/learning';
import type { HomeSpeakingSnapshot } from './homeTypes';
import {
  computeRecentAverageScore,
  filterProfilePracticeResults,
} from '../profile/profileEvidenceService';

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Compact speaking snapshot for Home.
 * Uses the same profile evidence filters as Progress.
 */
export function buildHomeSpeakingSnapshot(input: {
  profile: UserLearningProfile;
  practiceResults: PracticeResult[];
  nowMs?: number;
}): HomeSpeakingSnapshot {
  const results = filterProfilePracticeResults(input.practiceResults);
  const hasPracticeHistory = results.length > 0;
  const nowMs = input.nowMs ?? Date.now();
  const weekStart = startOfLocalDay(nowMs) - 6 * 24 * 60 * 60 * 1000;

  const streakValue =
    hasPracticeHistory && input.profile.currentStreak > 0
      ? input.profile.currentStreak
      : hasPracticeHistory
        ? 0
        : null;

  const averageValue = computeRecentAverageScore(results);

  const thisWeek = results.filter((result) => {
    const at = Date.parse(result.createdAt);
    return Number.isFinite(at) && at >= weekStart;
  });
  const prior = results.filter((result) => {
    const at = Date.parse(result.createdAt);
    return Number.isFinite(at) && at < weekStart;
  });

  let weeklyValue: number | null = null;
  let weeklyNeutral = true;

  if (prior.length >= 2 && thisWeek.length >= 2) {
    const delta =
      average(thisWeek.map((r) => r.nativeScore)) - average(prior.map((r) => r.nativeScore));
    weeklyValue = delta;
    weeklyNeutral = false;
  }

  return {
    hasPracticeHistory,
    streak: {
      key: 'streak',
      value: streakValue,
      isNeutral: streakValue == null,
    },
    average: {
      key: 'average',
      value: averageValue,
      isNeutral: averageValue == null,
    },
    weekly: {
      key: 'weekly',
      value: weeklyValue,
      isNeutral: weeklyNeutral,
    },
  };
}
