import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import type { PracticeResult } from '../../types/learning';
import type { WeakWordItem } from '../../types/weakWords';
import type { PersonalSpeakingProfile } from '../../types/speakingProfile';
import {
  computeMetricAverages,
  computeRecentAverageScore,
  computeSpeakingTrend,
  filterProfilePracticeResults,
} from './profileEvidenceService';
import {
  detectSpeakingFocusAreas,
  resolveStrongestWeakestMetrics,
  resolveUserSpeakingPriorities,
} from './speakingFocusAreaService';
import { resolveNextSpeakingFocus } from './nextSpeakingFocusService';
import { resolvePrimaryInsightId } from './speakingProgressEvidenceService';
import { filterWeakWordsByStatus } from '../weakWords/weakWordCatalogService';
import { isActiveWeakWordStatus } from '../weakWords/weakWordStatusService';
import { WORD_ACCURACY_BORDERLINE_MAX } from '../weakWords/weakWordThresholds';

export interface PersonalSpeakingProfileInput {
  practiceResults: PracticeResult[];
  weakWordCatalog: WeakWordItem[];
  userPriorities?: SpeakingPriority[];
  hasTodayPlan?: boolean;
}

export function buildPersonalSpeakingProfile(
  input: PersonalSpeakingProfileInput,
): PersonalSpeakingProfile {
  const validResults = filterProfilePracticeResults(input.practiceResults);
  const { strongest, weakest } = resolveStrongestWeakestMetrics(validResults);
  const metricAverages = computeMetricAverages(validResults);
  const { trend, delta } = computeSpeakingTrend(validResults);
  const recentAverageScore = computeRecentAverageScore(validResults);

  const activeWeakWordCount = input.weakWordCatalog.filter((item) =>
    isActiveWeakWordStatus(item.status),
  ).length;
  const improvingWeakWordCount = filterWeakWordsByStatus(input.weakWordCatalog, [
    'improving',
  ]).length;
  const masteredWeakWordCount = filterWeakWordsByStatus(input.weakWordCatalog, [
    'mastered',
  ]).length;

  const topWeakWords = input.weakWordCatalog
    .filter((item) => isActiveWeakWordStatus(item.status))
    .slice(0, 3);

  const userPriorities = resolveUserSpeakingPriorities(input.userPriorities);
  const detectedFocusAreas = detectSpeakingFocusAreas({
    practiceResults: validResults,
    weakWordCatalog: input.weakWordCatalog,
    weakestMetric: weakest,
  });

  const primaryInsightId = resolvePrimaryInsightId({
    totalAttempts: validResults.length,
    recentTrend: trend,
    detectedFocusAreas,
    improvingWeakWordCount,
    weakestMetric: weakest?.metric ?? null,
  });

  const profileBase = {
    totalAnalyzedAttempts: validResults.length,
    recentAverageScore,
    recentTrend: trend,
    recentTrendDelta: delta,
    strongestMetric: strongest,
    weakestMetric: weakest,
    metricAverages,
    activeWeakWordCount,
    improvingWeakWordCount,
    masteredWeakWordCount,
    topWeakWords,
    userPriorities,
    detectedFocusAreas,
    primaryInsightId,
  };

  const nextFocusId = resolveNextSpeakingFocus({
    profile: profileBase,
    weakWordCatalog: input.weakWordCatalog,
    userPriorities,
    practiceResults: validResults,
    hasTodayPlan: input.hasTodayPlan,
  });

  return {
    ...profileBase,
    nextFocusId,
    insightId: primaryInsightId,
    strongestMetricLegacy: strongest?.metric ?? null,
    weakestMetricLegacy: weakest?.metric ?? null,
  };
}

export function isEligibleWeakWordPracticeScore(
  accuracyScore: number,
  issueType?: string | null,
): boolean {
  if (
    issueType === 'missing' ||
    issueType === 'recognition_mismatch' ||
    issueType === 'low_confidence'
  ) {
    return false;
  }
  return accuracyScore < WORD_ACCURACY_BORDERLINE_MAX;
}

/** @deprecated use computeSpeakingTrend from profileEvidenceService */
export function resolveRecentTrend(
  practiceResults: PracticeResult[],
): PersonalSpeakingProfile['recentTrend'] {
  return computeSpeakingTrend(practiceResults).trend;
}
