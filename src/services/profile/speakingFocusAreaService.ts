import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import type { PracticeResult } from '../../types/learning';
import type { WeakWordItem } from '../../types/weakWords';
import type {
  MetricSnapshot,
  SpeakingFocusArea,
  SpeakingMetric,
} from '../../types/speakingProfile';
import {
  PROFILE_FOCUS_AREAS_MAX,
  PROFILE_LOW_METRIC_THRESHOLD,
  PROFILE_METRIC_MIN_SAMPLES,
  PROFILE_WEAK_WORDS_FOCUS_MIN,
  PROFILE_WEAKEST_MIN_METRICS,
} from './profileThresholds';
import {
  collectMetricSamples,
  computeMetricAverages,
  filterProfilePracticeResults,
} from './profileEvidenceService';
import { isActiveWeakWordStatus } from '../weakWords/weakWordStatusService';
import { WORD_ACCURACY_SEVERE_MAX } from '../weakWords/weakWordThresholds';

export interface SpeakingFocusAreaInput {
  practiceResults: PracticeResult[];
  weakWordCatalog: WeakWordItem[];
  weakestMetric: MetricSnapshot | null;
}

function countRepeatedPronunciationWeakness(results: PracticeResult[]): number {
  let count = 0;
  for (const result of results) {
    const events = result.pronunciationWeakEvents ?? [];
    if (events.some((e) => e.severity === 'severe')) {
      count += 1;
    } else if (
      Number.isFinite(result.pronunciationScore) &&
      result.pronunciationScore < PROFILE_LOW_METRIC_THRESHOLD
    ) {
      count += 1;
    }
  }
  return count;
}

function countLowCompleteness(results: PracticeResult[]): number {
  return results.filter(
    (r) =>
      typeof r.completenessScore === 'number' &&
      Number.isFinite(r.completenessScore) &&
      r.completenessScore < PROFILE_LOW_METRIC_THRESHOLD,
  ).length;
}

function metricToFocusArea(metric: SpeakingMetric): SpeakingFocusArea | null {
  if (metric === 'accuracy') return null;
  return metric;
}

export function resolveStrongestWeakestMetrics(
  practiceResults: PracticeResult[],
): { strongest: MetricSnapshot | null; weakest: MetricSnapshot | null } {
  const averages = computeMetricAverages(practiceResults);
  const eligible: MetricSnapshot[] = [];

  const metrics: SpeakingMetric[] = [
    'pronunciation',
    'fluency',
    'accuracy',
    'prosody',
    'completeness',
  ];

  for (const metric of metrics) {
    const samples = collectMetricSamples(practiceResults, metric);
    if (samples.length < PROFILE_METRIC_MIN_SAMPLES) continue;
    const avg = averages[metric];
    if (typeof avg === 'number' && Number.isFinite(avg)) {
      eligible.push({ metric, average: avg });
    }
  }

  if (eligible.length === 0) {
    return { strongest: null, weakest: null };
  }

  const sorted = [...eligible].sort((a, b) => b.average - a.average);
  const strongest = sorted[0] ?? null;
  const weakest =
    eligible.length >= PROFILE_WEAKEST_MIN_METRICS
      ? sorted[sorted.length - 1] ?? null
      : null;

  return { strongest, weakest };
}

/**
 * Deterministic detected focus areas from measured evidence only.
 * User-declared priorities (vocabulary, confidence, etc.) are never included.
 */
export function detectSpeakingFocusAreas(
  input: SpeakingFocusAreaInput,
): SpeakingFocusArea[] {
  const results = filterProfilePracticeResults(input.practiceResults);
  const candidates: Array<{ area: SpeakingFocusArea; score: number }> = [];

  const activeWeakWords = input.weakWordCatalog.filter((item) =>
    isActiveWeakWordStatus(item.status),
  );
  if (activeWeakWords.length >= PROFILE_WEAK_WORDS_FOCUS_MIN) {
    candidates.push({ area: 'weak_words', score: activeWeakWords.length * 10 });
  }

  const severeWords = activeWeakWords.filter(
    (item) =>
      typeof item.lastAccuracy === 'number' &&
      item.lastAccuracy < WORD_ACCURACY_SEVERE_MAX,
  );
  if (severeWords.length >= 2) {
    candidates.push({ area: 'weak_words', score: severeWords.length * 12 });
  }

  const pronunciationWeakness = countRepeatedPronunciationWeakness(results);
  if (pronunciationWeakness >= 2) {
    candidates.push({ area: 'pronunciation', score: pronunciationWeakness * 8 });
  }

  const fluencySamples = collectMetricSamples(results, 'fluency');
  if (fluencySamples.length >= PROFILE_METRIC_MIN_SAMPLES) {
    const fluencyAvg =
      fluencySamples.reduce((sum, v) => sum + v, 0) / fluencySamples.length;
    if (fluencyAvg < PROFILE_LOW_METRIC_THRESHOLD) {
      candidates.push({ area: 'fluency', score: PROFILE_LOW_METRIC_THRESHOLD - fluencyAvg });
    }
  }

  const prosodySamples = collectMetricSamples(results, 'prosody');
  if (prosodySamples.length >= PROFILE_METRIC_MIN_SAMPLES) {
    const prosodyAvg =
      prosodySamples.reduce((sum, v) => sum + v, 0) / prosodySamples.length;
    if (prosodyAvg < PROFILE_LOW_METRIC_THRESHOLD) {
      candidates.push({ area: 'prosody', score: PROFILE_LOW_METRIC_THRESHOLD - prosodyAvg });
    }
  }

  const completenessLow = countLowCompleteness(results);
  if (completenessLow >= 2) {
    candidates.push({ area: 'completeness', score: completenessLow * 7 });
  }

  if (input.weakestMetric) {
    const focus = metricToFocusArea(input.weakestMetric.metric);
    if (focus) {
      candidates.push({
        area: focus,
        score: PROFILE_LOW_METRIC_THRESHOLD - input.weakestMetric.average + 5,
      });
    }
  }

  const merged = new Map<SpeakingFocusArea, number>();
  for (const item of candidates) {
    merged.set(item.area, Math.max(merged.get(item.area) ?? 0, item.score));
  }

  return Array.from(merged.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, PROFILE_FOCUS_AREAS_MAX)
    .map(([area]) => area);
}

/** User priorities are preserved separately — never auto-detected as weaknesses. */
export function resolveUserSpeakingPriorities(
  priorities: SpeakingPriority[] | undefined,
): SpeakingPriority[] {
  return Array.isArray(priorities) ? priorities : [];
}
