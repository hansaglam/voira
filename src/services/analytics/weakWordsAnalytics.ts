/**
 * Weak words analytics — no spoken words or transcripts.
 */

export type WeakWordsAnalyticsEvent =
  | 'weak_words_screen_viewed'
  | 'weak_word_practice_started'
  | 'weak_word_attempt_completed'
  | 'weak_word_retry_tapped'
  | 'weak_word_next_tapped'
  | 'weak_word_status_changed'
  | 'weak_words_empty_state_viewed';

export interface WeakWordsAnalyticsPayload {
  status?: string | null;
  scoreBand?: string | null;
  queuePosition?: number | null;
  guest?: boolean | null;
}

export function trackWeakWordsEvent(
  event: WeakWordsAnalyticsEvent,
  payload?: WeakWordsAnalyticsPayload,
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload ?? {});
  }
}
