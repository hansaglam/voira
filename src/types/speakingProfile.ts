import type { SpeakingPriority } from '../services/personalization/personalSpeakingPlanTypes';
import type { WeakWordItem } from './weakWords';

export type SpeakingMetric =
  | 'pronunciation'
  | 'fluency'
  | 'accuracy'
  | 'prosody'
  | 'completeness';

export type SpeakingTrend =
  | 'improving'
  | 'stable'
  | 'declining'
  | 'insufficient_data';

export type SpeakingFocusArea =
  | 'pronunciation'
  | 'fluency'
  | 'completeness'
  | 'prosody'
  | 'weak_words';

export type ProfileInsightId =
  | 'profile_insufficient_data'
  | 'profile_building_baseline'
  | 'profile_recent_improvement'
  | 'profile_pronunciation_focus'
  | 'profile_fluency_focus'
  | 'profile_weak_words_focus'
  | 'profile_balanced_progress'
  | 'profile_regression_watch'
  | 'profile_weak_words_improving';

export type NextFocusId =
  | 'next_weak_words_practice'
  | 'next_metric_pronunciation'
  | 'next_metric_fluency'
  | 'next_metric_prosody'
  | 'next_metric_completeness'
  | 'next_today_plan'
  | 'next_consistency';

export interface MetricSnapshot {
  metric: SpeakingMetric;
  average: number;
}

export interface PersonalSpeakingProfile {
  totalAnalyzedAttempts: number;
  recentAverageScore: number | null;
  recentTrend: SpeakingTrend;
  recentTrendDelta: number | null;
  strongestMetric: MetricSnapshot | null;
  weakestMetric: MetricSnapshot | null;
  metricAverages: Partial<Record<SpeakingMetric, number>>;
  activeWeakWordCount: number;
  improvingWeakWordCount: number;
  masteredWeakWordCount: number;
  topWeakWords: WeakWordItem[];
  userPriorities: SpeakingPriority[];
  detectedFocusAreas: SpeakingFocusArea[];
  primaryInsightId: ProfileInsightId;
  nextFocusId: NextFocusId;
  /** @deprecated use primaryInsightId */
  insightId?: ProfileInsightId;
  /** @deprecated use strongestMetric.metric */
  strongestMetricLegacy?: SpeakingMetric | null;
  /** @deprecated use weakestMetric.metric */
  weakestMetricLegacy?: SpeakingMetric | null;
}

export type ProgressEvidenceKind =
  | 'retry_improvement'
  | 'weak_words_improving'
  | 'weak_word_mastered'
  | 'recent_trend';

export interface SpeakingProgressEvidenceItem {
  kind: ProgressEvidenceKind;
  /** i18n key under progress.evidence.* */
  messageKey: string;
  params?: Record<string, string | number>;
}
