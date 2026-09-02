import type { PracticeResult } from '../../types/learning';
import type { WeakWordItem } from '../../types/weakWords';
import type {
  ProfileInsightId,
  SpeakingFocusArea,
  SpeakingProgressEvidenceItem,
  SpeakingTrend,
} from '../../types/speakingProfile';
import { PROFILE_EVIDENCE_MAX_ITEMS } from './profileThresholds';
import { filterProfilePracticeResults } from './profileEvidenceService';
import {
  buildAttemptComparison,
  findComparablePriorAttempt,
} from '../analysis/result/analysisAttemptComparisonService';
import { filterWeakWordsByStatus } from '../weakWords/weakWordCatalogService';

export function resolvePrimaryInsightId(input: {
  totalAttempts: number;
  recentTrend: SpeakingTrend;
  detectedFocusAreas: SpeakingFocusArea[];
  improvingWeakWordCount: number;
  weakestMetric: string | null;
}): ProfileInsightId {
  if (input.totalAttempts === 0) return 'profile_insufficient_data';
  if (input.totalAttempts < 3) return 'profile_building_baseline';
  if (input.recentTrend === 'improving') return 'profile_recent_improvement';
  if (input.recentTrend === 'declining') return 'profile_regression_watch';
  if (input.improvingWeakWordCount > 0) return 'profile_weak_words_improving';
  if (input.detectedFocusAreas.includes('weak_words')) return 'profile_weak_words_focus';
  if (input.detectedFocusAreas.includes('pronunciation') || input.weakestMetric === 'pronunciation') {
    return 'profile_pronunciation_focus';
  }
  if (input.detectedFocusAreas.includes('fluency') || input.weakestMetric === 'fluency') {
    return 'profile_fluency_focus';
  }
  return 'profile_balanced_progress';
}

export function buildSpeakingProgressEvidence(input: {
  practiceResults: PracticeResult[];
  weakWordCatalog: WeakWordItem[];
  recentTrend: SpeakingTrend;
  recentTrendDelta: number | null;
}): SpeakingProgressEvidenceItem[] {
  const items: SpeakingProgressEvidenceItem[] = [];
  const results = filterProfilePracticeResults(input.practiceResults);

  if (results[0]) {
    const latest = results[0];
    const prior = findComparablePriorAttempt(results.slice(1), {
      lessonId: latest.lessonId,
      segmentId: latest.segmentId,
      mode: latest.mode,
      attemptId: latest.attemptId ?? latest.resultId,
      createdAt: latest.createdAt,
      nativeScore: latest.nativeScore,
    });
    if (prior) {
      const comparison = buildAttemptComparison(results.slice(1), {
        lessonId: latest.lessonId,
        segmentId: latest.segmentId,
        mode: latest.mode,
        attemptId: latest.attemptId ?? latest.resultId,
        createdAt: latest.createdAt,
        nativeScore: latest.nativeScore,
      });
      if (comparison && comparison.direction === 'improved' && comparison.delta > 0) {
        items.push({
          kind: 'retry_improvement',
          messageKey: 'retryImprovement',
          params: { delta: comparison.delta },
        });
      }
    }
  }

  const improvingCount = filterWeakWordsByStatus(input.weakWordCatalog, ['improving']).length;
  if (improvingCount > 0) {
    items.push({
      kind: 'weak_words_improving',
      messageKey: 'weakWordsImproving',
      params: { count: improvingCount },
    });
  }

  const masteredCount = filterWeakWordsByStatus(input.weakWordCatalog, ['mastered']).length;
  if (masteredCount > 0 && items.length < PROFILE_EVIDENCE_MAX_ITEMS) {
    items.push({
      kind: 'weak_word_mastered',
      messageKey: 'weakWordMastered',
      params: { count: masteredCount },
    });
  }

  if (
    items.length < PROFILE_EVIDENCE_MAX_ITEMS &&
    input.recentTrend === 'improving' &&
    typeof input.recentTrendDelta === 'number' &&
    input.recentTrendDelta > 0
  ) {
    items.push({
      kind: 'recent_trend',
      messageKey: 'recentTrendUp',
      params: { delta: input.recentTrendDelta },
    });
  }

  return items.slice(0, PROFILE_EVIDENCE_MAX_ITEMS);
}
