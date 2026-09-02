import type { PracticeResult } from '../../types/learning';
import { WEAK_WORD_PRACTICE_LESSON_ID } from '../../data/weakWordPracticeLesson';
import {
  PROFILE_RECENT_ATTEMPTS_MAX,
  PROFILE_TREND_MIN_ATTEMPTS,
  PROFILE_TREND_DELTA_MIN,
  PROFILE_TREND_WINDOW_MIN,
} from './profileThresholds';
import type { SpeakingMetric, SpeakingTrend } from '../../types/speakingProfile';

export function isValidProfilePracticeResult(result: PracticeResult): boolean {
  if (!result?.resultId) return false;
  if (result.lessonId === WEAK_WORD_PRACTICE_LESSON_ID) return false;
  if (!Number.isFinite(result.nativeScore)) return false;
  return true;
}

export function filterProfilePracticeResults(
  practiceResults: PracticeResult[],
): PracticeResult[] {
  return [...practiceResults]
    .filter(isValidProfilePracticeResult)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function selectRecentProfileAttempts(
  practiceResults: PracticeResult[],
  max = PROFILE_RECENT_ATTEMPTS_MAX,
): PracticeResult[] {
  return filterProfilePracticeResults(practiceResults).slice(0, max);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function computeRecentAverageScore(
  practiceResults: PracticeResult[],
): number | null {
  const recent = selectRecentProfileAttempts(practiceResults);
  const scores = recent.map((r) => r.nativeScore).filter(Number.isFinite);
  return average(scores);
}

function metricValue(result: PracticeResult, metric: SpeakingMetric): number | null {
  switch (metric) {
    case 'pronunciation':
      return Number.isFinite(result.pronunciationScore) ? result.pronunciationScore : null;
    case 'fluency':
      return Number.isFinite(result.fluencyScore) ? result.fluencyScore : null;
    case 'accuracy':
      return Number.isFinite(result.confidenceScore) ? result.confidenceScore : null;
    case 'prosody':
      return Number.isFinite(result.rhythmScore) ? result.rhythmScore : null;
    case 'completeness':
      return typeof result.completenessScore === 'number' &&
        Number.isFinite(result.completenessScore)
        ? result.completenessScore
        : null;
    default:
      return null;
  }
}

export function collectMetricSamples(
  practiceResults: PracticeResult[],
  metric: SpeakingMetric,
): number[] {
  return selectRecentProfileAttempts(practiceResults)
    .map((result) => metricValue(result, metric))
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

export function computeMetricAverages(
  practiceResults: PracticeResult[],
): Partial<Record<SpeakingMetric, number>> {
  const metrics: SpeakingMetric[] = [
    'pronunciation',
    'fluency',
    'accuracy',
    'prosody',
    'completeness',
  ];
  const averages: Partial<Record<SpeakingMetric, number>> = {};
  for (const metric of metrics) {
    const samples = collectMetricSamples(practiceResults, metric);
    const avg = average(samples);
    if (avg !== null) averages[metric] = avg;
  }
  return averages;
}

export function computeSpeakingTrend(
  practiceResults: PracticeResult[],
): { trend: SpeakingTrend; delta: number | null } {
  const recent = selectRecentProfileAttempts(practiceResults);
  if (recent.length < PROFILE_TREND_MIN_ATTEMPTS) {
    return { trend: 'insufficient_data', delta: null };
  }

  const chronological = [...recent].reverse();
  const mid = Math.floor(chronological.length / 2);
  const earlier = chronological.slice(0, mid);
  const later = chronological.slice(mid);
  if (earlier.length < PROFILE_TREND_WINDOW_MIN || later.length < PROFILE_TREND_WINDOW_MIN) {
    return { trend: 'insufficient_data', delta: null };
  }

  const earlierAvg = average(earlier.map((r) => r.nativeScore).filter(Number.isFinite));
  const laterAvg = average(later.map((r) => r.nativeScore).filter(Number.isFinite));
  if (earlierAvg === null || laterAvg === null) {
    return { trend: 'insufficient_data', delta: null };
  }

  const delta = laterAvg - earlierAvg;
  if (delta >= PROFILE_TREND_DELTA_MIN) {
    return { trend: 'improving', delta };
  }
  if (delta <= -PROFILE_TREND_DELTA_MIN) {
    return { trend: 'declining', delta };
  }
  return { trend: 'stable', delta };
}
