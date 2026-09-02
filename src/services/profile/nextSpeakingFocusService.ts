import type { SpeakingPriority } from '../personalization/personalSpeakingPlanTypes';
import type { PracticeResult } from '../../types/learning';
import type { WeakWordItem } from '../../types/weakWords';
import type {
  MetricSnapshot,
  NextFocusId,
  PersonalSpeakingProfile,
  SpeakingFocusArea,
} from '../../types/speakingProfile';
import { PROFILE_SEVERE_WEAK_WORDS_NEXT_FOCUS } from './profileThresholds';
import { isActiveWeakWordStatus } from '../weakWords/weakWordStatusService';
import { WORD_ACCURACY_SEVERE_MAX } from '../weakWords/weakWordThresholds';

const MEASURED_PRIORITY_TO_FOCUS: Partial<
  Record<SpeakingPriority, SpeakingFocusArea>
> = {
  pronunciation: 'pronunciation',
  fluency: 'fluency',
};

const METRIC_TO_NEXT_FOCUS: Partial<Record<string, NextFocusId>> = {
  pronunciation: 'next_metric_pronunciation',
  fluency: 'next_metric_fluency',
  prosody: 'next_metric_prosody',
  completeness: 'next_metric_completeness',
};

function countSevereActiveWeakWords(catalog: WeakWordItem[]): number {
  return catalog.filter(
    (item) =>
      isActiveWeakWordStatus(item.status) &&
      typeof item.lastAccuracy === 'number' &&
      item.lastAccuracy < WORD_ACCURACY_SEVERE_MAX,
  ).length;
}

function hasUnpracticedMeasuredPriority(
  priorities: SpeakingPriority[],
  practiceResults: PracticeResult[],
): SpeakingFocusArea | null {
  if (practiceResults.length === 0) return null;

  const recentLessonIds = new Set(
    practiceResults.slice(0, 5).map((r) => r.lessonId),
  );
  if (recentLessonIds.size === 0) return null;

  for (const priority of priorities) {
    const focus = MEASURED_PRIORITY_TO_FOCUS[priority];
    if (!focus) continue;
    return focus;
  }
  return null;
}

/**
 * Returns ONE recommended next focus — deterministic, no unavailable features.
 */
export function resolveNextSpeakingFocus(input: {
  profile: Pick<
    PersonalSpeakingProfile,
    'weakestMetric' | 'detectedFocusAreas' | 'activeWeakWordCount'
  >;
  weakWordCatalog: WeakWordItem[];
  userPriorities: SpeakingPriority[];
  practiceResults: PracticeResult[];
  hasTodayPlan?: boolean;
}): NextFocusId {
  const severeCount = countSevereActiveWeakWords(input.weakWordCatalog);
  if (severeCount >= PROFILE_SEVERE_WEAK_WORDS_NEXT_FOCUS) {
    return 'next_weak_words_practice';
  }

  if (input.profile.detectedFocusAreas.includes('weak_words') && input.profile.activeWeakWordCount > 0) {
    return 'next_weak_words_practice';
  }

  const weakest = input.profile.weakestMetric;
  if (weakest) {
    const mapped = METRIC_TO_NEXT_FOCUS[weakest.metric];
    if (mapped) return mapped;
  }

  const unpracticedPriority = hasUnpracticedMeasuredPriority(
    input.userPriorities,
    input.practiceResults,
  );
  if (unpracticedPriority) {
    const mapped = METRIC_TO_NEXT_FOCUS[unpracticedPriority];
    if (mapped) return mapped;
  }

  if (input.hasTodayPlan) {
    return 'next_today_plan';
  }

  return 'next_consistency';
}

export function resolvePrimaryCurrentFocus(
  profile: Pick<PersonalSpeakingProfile, 'detectedFocusAreas' | 'weakestMetric'>,
): SpeakingFocusArea | null {
  if (profile.detectedFocusAreas[0]) return profile.detectedFocusAreas[0];
  if (profile.weakestMetric) {
    const metric = profile.weakestMetric.metric;
    if (metric === 'accuracy') return null;
    return metric;
  }
  return null;
}

export function metricSnapshotToFocusArea(
  snapshot: MetricSnapshot | null,
): SpeakingFocusArea | null {
  if (!snapshot) return null;
  if (snapshot.metric === 'accuracy') return null;
  return snapshot.metric;
}
