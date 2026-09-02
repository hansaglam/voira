import type { SpeakingMetric } from '../../types/speakingProfile';
import type { WeeklyHighlight } from './weeklyReportTypes';

export const WEEKLY_HIGHLIGHTS_MAX = 3;
export const WEEKLY_MEANINGFUL_DELTA = 5;

export function buildWeeklyProgressHighlights(input: {
  scoreDelta: number | null;
  bestMetricImprovement: { metric: SpeakingMetric; delta: number } | null;
  successfulRetryDelta: number | null;
  improvingWeakWordCount: number;
  masteredWeakWordCount: number;
  roleplaySessionsCompleted: number;
  practiceDays: number;
}): WeeklyHighlight[] {
  const highlights: WeeklyHighlight[] = [];
  if (input.scoreDelta != null && input.scoreDelta >= WEEKLY_MEANINGFUL_DELTA) {
    highlights.push({ id: 'score_improved', value: input.scoreDelta });
  }
  if (input.bestMetricImprovement && input.bestMetricImprovement.delta >= WEEKLY_MEANINGFUL_DELTA) {
    highlights.push({ id: 'metric_improved', metric: input.bestMetricImprovement.metric, value: input.bestMetricImprovement.delta });
  }
  if (input.masteredWeakWordCount > 0) {
    highlights.push({ id: 'weak_words_mastered', value: input.masteredWeakWordCount });
  }
  if (input.improvingWeakWordCount > 0) {
    highlights.push({ id: 'weak_words_improving', value: input.improvingWeakWordCount });
  }
  if (input.successfulRetryDelta != null && input.successfulRetryDelta >= WEEKLY_MEANINGFUL_DELTA) {
    highlights.push({ id: 'retry_improved', value: input.successfulRetryDelta });
  }
  if (input.roleplaySessionsCompleted > 0) {
    highlights.push({ id: 'roleplay_completed', value: input.roleplaySessionsCompleted });
  }
  if (input.practiceDays >= 3) {
    highlights.push({ id: 'practice_consistency', value: input.practiceDays });
  }
  return highlights.slice(0, WEEKLY_HIGHLIGHTS_MAX);
}
