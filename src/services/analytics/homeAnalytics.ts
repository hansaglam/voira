type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export type HomeAnalyticsEvent =
  | 'home_viewed'
  | 'today_practice_started'
  | 'coach_insight_viewed'
  | 'weak_words_preview_tapped'
  | 'continue_learning_tapped'
  | 'weekly_progress_tapped'
  | 'home_premium_tapped';

/**
 * Lightweight Home analytics — no external SDK yet.
 * Safe no-op in production; logs in development.
 */
export function trackHomeEvent(
  event: HomeAnalyticsEvent,
  payload: AnalyticsPayload = {},
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload);
  }
}
