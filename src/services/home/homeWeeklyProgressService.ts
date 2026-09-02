import type { PracticeResult } from '../../types/learning';
import type { HomeWeeklyProgress } from './homeTypes';
import { getLocalWeeklyWindow, isTimestampInWindow, selectWeeklyEligiblePractices } from '../weeklyReport';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Compact “This week” preview using the canonical calendar-week semantics.
 * Lesson minutes are estimates, so V1 deliberately omits them.
 */
export function buildHomeWeeklyProgress(input: {
  practiceResults: PracticeResult[];
  lessons: unknown[];
  nowMs?: number;
}): HomeWeeklyProgress {
  const results = selectWeeklyEligiblePractices(Array.isArray(input.practiceResults) ? input.practiceResults : []);
  const nowMs = input.nowMs ?? Date.now();
  const window = getLocalWeeklyWindow(nowMs);
  const thisWeek = results.filter((result) => isTimestampInWindow(result.createdAt, window.currentStartMs, window.currentEndMs));
  const prior = results.filter((result) => isTimestampInWindow(result.createdAt, window.previousStartMs, window.previousEndMs));

  let averageFrom: number | null = null;
  let averageTo: number | null = null;
  if (thisWeek.length >= 2 && prior.length >= 2) {
    averageFrom = average(prior.map((r) => r.nativeScore));
    averageTo = average(thisWeek.map((r) => r.nativeScore));
  }

  return {
    practiceCount: thisWeek.length,
    speakingMinutes: null,
    averageFrom,
    averageTo,
    hasEnoughData: thisWeek.length > 0,
  };
}
