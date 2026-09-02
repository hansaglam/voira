type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export type RoleplayAnalyticsEvent =
  | 'roleplay_discover_viewed'
  | 'roleplay_scenario_selected'
  | 'roleplay_session_started'
  | 'roleplay_recording_started'
  | 'roleplay_recording_completed'
  | 'roleplay_transcription_succeeded'
  | 'roleplay_transcription_failed'
  | 'roleplay_turn_sent'
  | 'roleplay_ai_reply_received'
  | 'roleplay_ai_playback_started'
  | 'roleplay_ai_playback_failed'
  | 'roleplay_session_completed'
  | 'roleplay_session_abandoned'
  | 'roleplay_session_retry'
  | 'roleplay_result_viewed'
  | 'roleplay_coaching_generated'
  | 'roleplay_coaching_failed'
  | 'roleplay_phrase_suggestion_viewed'
  | 'roleplay_result_retry_tapped'
  | 'roleplay_result_continue_tapped';

export function trackRoleplayEvent(
  event: RoleplayAnalyticsEvent,
  payload: AnalyticsPayload = {},
): void {
  if (__DEV__) {
    console.log('[Voira Analytics]', event, payload);
  }
}
