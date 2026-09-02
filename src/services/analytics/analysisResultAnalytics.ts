/**
 * Internal analysis result analytics — no transcript or spoken words.
 */

export type AnalysisResultScoreBand =
  | 'retry'
  | 'building'
  | 'growing'
  | 'good'
  | 'excellent';

export type AnalysisAnalyticsEvent =
  | 'analysis_result_viewed'
  | 'analysis_retry_tapped'
  | 'analysis_continue_tapped'
  | 'analysis_word_detail_opened'
  | 'analysis_all_words_opened'
  | 'analysis_improvement_shown';

export interface AnalysisAnalyticsPayload {
  scoreBand?: AnalysisResultScoreBand | string | null;
  issueType?: string | null;
  isRetry?: boolean;
  improvementDirection?: 'improved' | 'declined' | 'similar' | null;
}

export function trackAnalysisResultEvent(
  event: AnalysisAnalyticsEvent,
  payload?: AnalysisAnalyticsPayload,
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload ?? {});
  }
}
