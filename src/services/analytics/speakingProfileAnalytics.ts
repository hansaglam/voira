type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export type SpeakingProfileAnalyticsEvent =
  | 'speaking_profile_viewed'
  | 'speaking_profile_metric_opened'
  | 'speaking_profile_weak_words_tapped'
  | 'speaking_profile_next_focus_tapped'
  | 'speaking_profile_goal_alignment_viewed';

export function trackSpeakingProfileEvent(
  event: SpeakingProfileAnalyticsEvent,
  payload: AnalyticsPayload = {},
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload);
  }
}
